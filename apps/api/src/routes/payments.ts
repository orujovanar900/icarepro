import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'

const listQuerySchema = z.object({
    contractId: z.string().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).optional(),
    paymentType: z.enum(['CASH', 'BANK', 'CARD', 'ONLINE']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    deleted: z.enum(['true', 'false']).optional(),
})

const createSchema = z.object({
    contractId: z.string().min(1),
    amount: z.number().positive(),
    paymentDate: z.string().date(),
    paymentType: z.enum(['CASH', 'BANK', 'CARD', 'ONLINE']),
    periodMonth: z.number().int().min(1).max(12).optional(),
    periodYear: z.number().int().min(2020).optional(),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    isPenalty: z.boolean().default(false),
    penaltyNote: z.string().optional(),
    note: z.string().optional(),
})

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /payments
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = listQuerySchema.safeParse(req.query)
        if (!q.success) return sendZodError(reply, q.error)

        const { contractId, month, year, paymentType, limit, offset, deleted } = q.data
        const org = withOrg(req)
        const isDeleted = deleted === 'true'

        const where = {
            ...org,
            deletedAt: isDeleted ? { not: null } : null,
            ...(contractId ? { contractId } : {}),
            ...(paymentType ? { paymentType } : {}),
            ...(month ? { periodMonth: month } : {}),
            ...(year ? { periodYear: year } : {}),
        }

        const [payments, total, totalAmountAgg] = await Promise.all([
            fastify.prisma.payment.findMany({
                where,
                include: {
                    contract: {
                        select: { number: true, tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true } } },
                    },
                    createdByUser: { select: { id: true, name: true } },
                },
                orderBy: { paymentDate: 'desc' },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.payment.count({ where }),
            fastify.prisma.payment.aggregate({ _sum: { amount: true }, where }),
        ])

        const paymentsMapped = payments.map(p => ({
            ...p,
            contract: {
                ...p.contract,
                tenant: {
                    ...p.contract.tenant,
                    fullName: p.contract.tenant.tenantType === 'fiziki' ? `${p.contract.tenant.firstName || ''} ${p.contract.tenant.lastName || ''}`.trim() : p.contract.tenant.companyName || '',
                }
            }
        }))

        return reply.send({
            success: true,
            data: paymentsMapped,
            meta: {
                total,
                limit,
                offset,
                totalAmount: Number(totalAmountAgg._sum.amount ?? 0),
            },
        })
    })

    // POST /payments
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'CASHIER'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        // Валидация периода в зависимости от типа контракта
        const contract = await fastify.prisma.contract.findFirst({
            where: { id: body.data.contractId, ...withOrg(req) },
            select: { rentalType: true, startDate: true },
        })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const { paymentDate, periodStart, periodEnd, amount, ...rest } = body.data

        if (contract.rentalType === 'RESIDENTIAL_SHORT') {
            if (!periodStart || !periodEnd) {
                return reply.code(400).send({
                    success: false,
                    error: 'periodStart and periodEnd are required for short-term rentals',
                })
            }
        } else {
            if (!rest.periodMonth || !rest.periodYear) {
                return reply.code(400).send({
                    success: false,
                    error: 'periodMonth and periodYear are required',
                })
            }
            // Temporal validation: reject implausible period years
            const currentYear = new Date().getFullYear()
            if (rest.periodYear < currentYear - 2) {
                return reply.code(400).send({
                    success: false,
                    error: `periodYear ${rest.periodYear} is too far in the past (max 2 years back)`,
                })
            }
            if (rest.periodYear > currentYear + 1) {
                return reply.code(400).send({
                    success: false,
                    error: `periodYear ${rest.periodYear} is too far in the future (max 1 year ahead)`,
                })
            }
        }

        // Validate paymentDate is not absurdly old or far in the future
        const paymentDateObj = new Date(paymentDate)
        const now = new Date()
        const minDate = new Date(now.getFullYear() - 2, 0, 1)
        const maxDate = new Date(now.getFullYear() + 1, 11, 31)
        if (paymentDateObj < minDate || paymentDateObj > maxDate) {
            return reply.code(400).send({
                success: false,
                error: 'paymentDate must be within a reasonable range (−2 years to +1 year from today)',
            })
        }

        // Validate paymentDate is not before the contract started
        if (paymentDateObj < contract.startDate) {
            return reply.code(400).send({
                success: false,
                error: 'Ödəniş tarixi müqavilənin başlama tarixindən əvvəl ola bilməz',
            })
        }

        // Validate periodMonth/periodYear is not before the contract's start month
        if (contract.rentalType !== 'RESIDENTIAL_SHORT' && rest.periodMonth && rest.periodYear) {
            const contractStartMonth = contract.startDate.getMonth() + 1
            const contractStartYear = contract.startDate.getFullYear()
            if (
                rest.periodYear < contractStartYear ||
                (rest.periodYear === contractStartYear && rest.periodMonth < contractStartMonth)
            ) {
                return reply.code(400).send({
                    success: false,
                    error: 'Ödəniş dövrü müqavilənin başlama tarixindən əvvəl ola bilməz',
                })
            }
        }

        // Look for existing UNPAID or PARTIAL record for this period
        const existingUnpaid = contract.rentalType !== 'RESIDENTIAL_SHORT' && rest.periodMonth && rest.periodYear
            ? await fastify.prisma.payment.findFirst({
                where: {
                    contractId: body.data.contractId,
                    periodMonth: rest.periodMonth,
                    periodYear: rest.periodYear,
                    status: { in: ['UNPAID', 'PARTIAL'] },
                    deletedAt: null,
                },
            })
            : null

        let payment
        if (existingUnpaid) {
            const expected = Number(existingUnpaid.expectedAmount ?? amount)
            const newStatus: string = amount >= expected ? 'PAID' : 'PARTIAL'
            payment = await fastify.prisma.payment.update({
                where: { id: existingUnpaid.id },
                data: {
                    amount,
                    status: newStatus as never,
                    paymentDate: paymentDateObj,
                    paymentType: rest.paymentType,
                    note: rest.note ?? existingUnpaid.note,
                },
            })
        } else {
            // No UNPAID record — landlord recording before cron ran, status = PAID directly
            payment = await fastify.prisma.payment.create({
                data: {
                    ...rest,
                    ...withOrg(req),
                    amount,
                    paymentDate: paymentDateObj,
                    status: 'PAID' as never,
                    ...(periodStart ? { periodStart: new Date(periodStart) } : {}),
                    ...(periodEnd ? { periodEnd: new Date(periodEnd) } : {}),
                    createdBy: req.user.sub,
                } as never,
            })
        }

        // Calculate updated total debt for this org
        const orgFilter = withOrg(req)
        const unpaidOverdue = await fastify.prisma.payment.aggregate({
            where: { ...orgFilter, status: { in: ['UNPAID', 'OVERDUE'] }, deletedAt: null },
            _sum: { expectedAmount: true },
        })
        const partialAgg = await fastify.prisma.payment.aggregate({
            where: { ...orgFilter, status: 'PARTIAL', deletedAt: null },
            _sum: { expectedAmount: true, amount: true },
        })
        const updatedDebt = Number(unpaidOverdue._sum.expectedAmount ?? 0)
            + Math.max(0, Number(partialAgg._sum.expectedAmount ?? 0) - Number(partialAgg._sum.amount ?? 0))

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'CREATE_PAYMENT',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: { amount: body.data.amount, contractId: body.data.contractId },
        })

        return reply.code(201).send({ success: true, data: payment, updatedDebt })
    })

    // DELETE /payments/:id — OWNER & MANAGER (Soft delete)
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const payment = await fastify.prisma.payment.findFirst({
            where: { id, ...withOrg(req) },
        })
        if (!payment) return reply.code(404).send({ success: false, error: 'Payment not found' })

        await fastify.prisma.payment.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'DELETE_PAYMENT',
            entityType: 'Payment',
            entityId: id,
            metadata: { deletedPayment: payment },
        })

        return reply.code(204).send()
    })

    // PATCH /payments/:id/restore (Restore)
    fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const payment = await fastify.prisma.payment.findFirst({
            where: { id, ...withOrg(req) },
        })
        if (!payment) return reply.code(404).send({ success: false, error: 'Payment not found' })

        await fastify.prisma.payment.update({
            where: { id },
            data: { deletedAt: null }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'RESTORE_PAYMENT',
            entityType: 'Payment',
            entityId: id,
        })

        return reply.send({ success: true })
    })
}

export default paymentsRoutes

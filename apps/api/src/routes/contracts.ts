import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'

// Inline tenant creation schema (mirrors the full tenant schemas)
const newTenantSchema = z.union([
    z.object({
        tenantType: z.literal('fiziki'),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        fatherName: z.string().optional(),
        fin: z.string().optional(),
        passportSeries: z.string().optional(),
        passportIssuedBy: z.string().optional(),
        passportIssuedAt: z.string().optional(),
        birthDate: z.string().optional(),
        phone: z.string().optional(),
        phone2: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        notes: z.string().optional(),
    }),
    z.object({
        tenantType: z.literal('huquqi'),
        companyName: z.string().min(1),
        voen: z.string().optional(),
        directorName: z.string().optional(),
        companyAddress: z.string().optional(),
        bankName: z.string().optional(),
        bankCode: z.string().optional(),
        iban: z.string().optional(),
        phone: z.string().optional(),
        phone2: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        notes: z.string().optional(),
    }),
])

const createSchema = z.object({
    number: z.string().min(1),
    propertyId: z.string().min(1),
    tenantId: z.string().optional(), // optional if newTenant is provided
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']),
    monthlyRent: z.number().positive(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    taxRate: z.number().min(0).max(100).optional(),
    depositAmount: z.number().min(0).optional(),
    baseRent: z.number().min(0).optional(),
    revenuePercent: z.number().min(0).max(100).optional(),
    dailyRate: z.number().min(0).optional(),
    parentContractId: z.string().optional(),
    notes: z.string().optional(),
    // Inline tenant creation
    newTenant: newTenantSchema.optional(),
    // When existing tenant's data was changed in contract form
    updateTenant: z.boolean().optional(),
})

const updateSchema = createSchema.partial()


const listQuerySchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sortBy: z.enum(['startDate', 'endDate', 'monthlyRent', 'number']).default('startDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const contractsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /contracts
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = listQuerySchema.safeParse(req.query)
        if (!q.success) return sendZodError(reply, q.error)

        const { status, rentalType, search, limit, offset, sortBy, sortOrder } = q.data
        const org = withOrg(req)

        const where = {
            ...org,
            ...(status ? { status } : {}),
            ...(rentalType ? { rentalType } : {}),
            ...(search ? {
                OR: [
                    { number: { contains: search, mode: 'insensitive' as const } },
                    {
                        tenant: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' as const } },
                                { lastName: { contains: search, mode: 'insensitive' as const } },
                                { companyName: { contains: search, mode: 'insensitive' as const } },
                            ]
                        }
                    },
                    { property: { name: { contains: search, mode: 'insensitive' as const } } },
                ],
            } : {}),
        }

        const [contracts, total] = await Promise.all([
            fastify.prisma.contract.findMany({
                where,
                include: {
                    property: { select: { id: true, number: true, name: true, address: true } },
                    tenant: { select: { id: true, tenantType: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
                    _count: { select: { payments: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.contract.count({ where }),
        ])

        // Calculate computed debt, expectedPaymentDate, and daysOverdue
        const contractsWithDebt = await Promise.all(contracts.map(async (c: any) => {
            const tenantFullName = c.tenant.tenantType === 'fiziki'
                ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim()
                : c.tenant.companyName || ''

            if (c.status !== 'ACTIVE') return {
                ...c,
                tenant: { ...c.tenant, fullName: tenantFullName },
                debt: 0,
                daysOverdue: 0
            }

            const totalPaidAgg = await fastify.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { contractId: c.id },
            })
            const totalPaid = Number(totalPaidAgg._sum.amount ?? 0)

            const now = new Date()
            const start = new Date(c.startDate)
            const end = c.endDate < now ? new Date(c.endDate) : now

            // Total months effectively elapsed
            const monthsElapsed = Math.max(0,
                (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
            )
            const totalExpected = Number(c.monthlyRent) * monthsElapsed
            const debt = Math.max(0, totalExpected - totalPaid)

            let daysOverdue = 0
            if (debt > 0) {
                // Determine expected payment date for the currently unpaid month
                // (Using monthsPaid completely to project the *next* expected cycle)
                const monthsPaidFully = Math.floor(totalPaid / Number(c.monthlyRent))

                const expectedDate = new Date(start)
                expectedDate.setMonth(expectedDate.getMonth() + monthsPaidFully)

                // If the expected payment date is in the past, it's overdue
                if (expectedDate < now) {
                    const diffTime = Math.abs(now.getTime() - expectedDate.getTime())
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                }
            }

            return {
                ...c,
                debt,
                daysOverdue
            }
        }))

        return reply.send({
            success: true,
            data: contractsWithDebt,
            meta: { total, limit, offset },
        })
    })

    // GET /contracts/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                property: true,
                tenant: true,
                payments: { orderBy: { paymentDate: 'desc' } },
                documents: { orderBy: { generatedAt: 'desc' } },
            },
        })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })
        return reply.send({ success: true, data: contract })
    })

    // POST /contracts
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { startDate, endDate, monthlyRent, newTenant, updateTenant, ...rest } = body.data

        // Resolve tenantId: either existing or create a new tenant inline
        let tenantId = rest.tenantId
        if (!tenantId && !newTenant) {
            return reply.code(400).send({ success: false, error: 'Either tenantId or newTenant must be provided' })
        }
        if (newTenant) {
            const createdTenant = await fastify.prisma.tenant.create({
                data: { ...newTenant, ...withOrg(req) } as never,
            })
            tenantId = createdTenant.id
        }

        const contract = await fastify.prisma.contract.create({
            data: {
                ...rest,
                tenantId: tenantId!,
                ...withOrg(req),
                monthlyRent,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            } as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'CREATE_CONTRACT',
            entityType: 'Contract',
            entityId: contract.id,
        })

        return reply.code(201).send({ success: true, data: contract })
    })

    // PATCH /contracts/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        // Получаем старые значения для AuditLog
        const old = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!old) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const { startDate, endDate, monthlyRent, ...rest } = body.data
        const data: Record<string, unknown> = { ...rest }
        if (monthlyRent !== undefined) data['monthlyRent'] = monthlyRent
        if (startDate !== undefined) data['startDate'] = new Date(startDate)
        if (endDate !== undefined) data['endDate'] = new Date(endDate)

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: data as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'UPDATE_CONTRACT',
            entityType: 'Contract',
            entityId: contract.id,
            metadata: { oldValue: old, newValue: body.data },
        })

        return reply.send({ success: true, data: contract })
    })

    // PATCH /contracts/:id/archive
    fastify.patch('/:id/archive', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'ARCHIVE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.send({ success: true, data: contract })
    })

    // GET /contracts/:id/audit-logs
    fastify.get('/:id/audit-logs', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const logs = await fastify.prisma.auditLog.findMany({
            where: { entityType: 'Contract', entityId: id },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        return reply.send({ success: true, data: logs })
    })

    // POST /contracts/:id/renew — extend end date
    fastify.post('/:id/renew', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = req.body as { newEndDate: string; newMonthlyRent?: number; note?: string }

        if (!body.newEndDate) return reply.code(400).send({ success: false, error: 'newEndDate is required' })

        const old = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!old) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const updateData: Record<string, unknown> = {
            endDate: new Date(body.newEndDate),
            status: 'ACTIVE',
        }
        if (body.newMonthlyRent !== undefined) updateData['monthlyRent'] = body.newMonthlyRent

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: updateData as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'RENEW_CONTRACT',
            entityType: 'Contract',
            entityId: id,
            metadata: {
                oldEndDate: old.endDate,
                newEndDate: body.newEndDate,
                note: body.note ?? null,
            },
        })

        return reply.send({ success: true, data: contract })
    })
}

export default contractsRoutes

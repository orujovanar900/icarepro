import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'
import { calculateContractDebtAndExpected, getNextPaymentDate, getDueDateForPaymentIndex } from '../utils/contractUtils.js'
import Anthropic from '@anthropic-ai/sdk'

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
    tenantId: z.string().optional(),
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']),
    monthlyRent: z.number().positive(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    taxRate: z.number().min(0).max(100).optional(),
    depositAmount: z.number().min(0).optional(),
    isDepositReturned: z.boolean().optional(),
    baseRent: z.number().min(0).optional(),
    revenuePercent: z.number().min(0).max(100).optional(),
    subType: z.string().optional(),
    dailyRate: z.number().min(0).optional(),
    parentContractId: z.string().optional(),
    notes: z.string().optional(),
    paymentMode: z.enum(['CALENDAR', 'FIXED_DAY']).optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    paymentTiming: z.enum(['PREPAID', 'POSTPAID']).default('PREPAID'),
    fixedPaymentDay: z.boolean().default(false),
    gracePeriodDays: z.number().int().min(0).max(30).default(0),
    firstPeriodAmount: z.number().positive().optional(),
    status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
    autoRenewal: z.boolean().default(false),
    renewalNoticeDays: z.number().int().min(1).max(180).optional(),
    renewalType: z.enum(['SAME_PERIOD', 'MONTHLY']).optional(),
    newTenant: newTenantSchema.optional(),
    updateTenant: z.boolean().optional(),
})

const updateSchema = z.object({
    number: z.string().min(1).optional(),
    monthlyRent: z.number().positive().optional(),
    propertyId: z.string().optional(),
    tenantId: z.string().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    depositAmount: z.number().min(0).optional(),
    isDepositReturned: z.boolean().optional(),
    baseRent: z.number().min(0).optional(),
    revenuePercent: z.number().min(0).max(100).optional(),
    subType: z.string().optional(),
    dailyRate: z.number().min(0).optional(),
    parentContractId: z.string().optional(),
    notes: z.string().optional(),
    paymentMode: z.enum(['CALENDAR', 'FIXED_DAY']).optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    paymentTiming: z.enum(['PREPAID', 'POSTPAID']).optional(),
    fixedPaymentDay: z.boolean().optional(),
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
    // TERMINATED is intentionally excluded — use PATCH /:id/terminate
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    autoRenewal: z.boolean().optional(),
    renewalNoticeDays: z.number().int().min(1).max(180).optional(),
    renewalType: z.enum(['SAME_PERIOD', 'MONTHLY']).optional(),
    effectiveFrom: z.object({
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2020).max(2099),
    }).optional(),
})


const listQuerySchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'TERMINATED']).optional(),
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sortBy: z.enum(['startDate', 'endDate', 'monthlyRent', 'number']).default('startDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    deleted: z.enum(['true', 'false']).optional(),
})

const contractsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /contracts
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = listQuerySchema.safeParse(req.query)
        if (!q.success) return sendZodError(reply, q.error)

        const { status, rentalType, search, limit, offset, sortBy, sortOrder, deleted } = q.data
        const org = withOrg(req)
        const isDeleted = deleted === 'true'

        const where: any = {
            ...org,
            deletedAt: isDeleted ? { not: null } : null,
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

        const contractIds = contracts.map(c => c.id);

        const paymentsAgg = await fastify.prisma.payment.groupBy({
            by: ['contractId'],
            where: { contractId: { in: contractIds } },
            _sum: { amount: true }
        });

        const paidMap = new Map<string, number>();
        paymentsAgg.forEach(agg => {
            paidMap.set(agg.contractId, Number(agg._sum.amount ?? 0));
        });

        // Calculate computed debt, expectedPaymentDate, and daysOverdue
        const contractsWithDebt = contracts.map((c: any) => {
            const tenantFullName = c.tenant
                ? (c.tenant.tenantType === 'fiziki'
                    ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim()
                    : c.tenant.companyName || '')
                : 'Naməlum';

            const tenantWithFullName = c.tenant ? { ...c.tenant, fullName: tenantFullName } : { id: '', fullName: 'Naməlum' };

            if (c.status !== 'ACTIVE' || !c.property) return {
                ...c,
                tenant: tenantWithFullName,
                property: c.property || { id: '', name: 'Naməlum', number: '-' },
                debt: 0,
                daysOverdue: 0
            }

            const totalPaid = paidMap.get(c.id) || 0;

            const now = new Date()
            const totalExpected = calculateContractDebtAndExpected(c, now)
            const debt = isNaN(totalExpected) ? 0 : Math.max(0, totalExpected - totalPaid)

            let daysOverdue = 0
            if (debt > 0) {
                const monthsPaidFully = Math.floor(totalPaid / Number(c.monthlyRent))
                const expectedDate = getDueDateForPaymentIndex(c, monthsPaidFully)

                if (expectedDate < now) {
                    const diffTime = Math.abs(now.getTime() - expectedDate.getTime())
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                }
            }

            return {
                ...c,
                tenant: tenantWithFullName,
                property: c.property || { id: '', name: 'Naməlum', number: '-' },
                debt: Number(debt.toFixed(2)),
                daysOverdue
            }
        })

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
            },
        })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })
        return reply.send({ success: true, data: contract })
    })

    // POST /contracts
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { startDate, endDate, monthlyRent, newTenant, updateTenant, firstPeriodAmount, ...rest } = body.data

        // Resolve tenantId: either existing or create a new tenant inline
        let tenantId = rest.tenantId
        if (!tenantId && !newTenant) {
            return reply.code(400).send({ success: false, error: 'Either tenantId or newTenant must be provided' })
        }
        if (newTenant) {
            // Guard: prevent duplicate tenant by email within this org
            if (newTenant.email) {
                const existing = await fastify.prisma.tenant.findFirst({
                    where: { email: newTenant.email, ...withOrg(req) },
                    select: { id: true },
                })
                if (existing) {
                    return reply.code(409).send({ success: false, error: 'Bu e-poçt ünvanı ilə icarəçi artıq mövcuddur' })
                }
            }
            const createdTenant = await fastify.prisma.tenant.create({
                data: { ...newTenant, ...withOrg(req) } as Prisma.TenantUncheckedCreateInput,
            })
            tenantId = createdTenant.id
        }

        // Property protection: block duplicate active contracts
        if (rest.propertyId) {
            const activeContract = await fastify.prisma.contract.findFirst({
                where: { propertyId: rest.propertyId as string, status: 'ACTIVE', deletedAt: null, ...withOrg(req) },
                select: { id: true, number: true },
            })
            if (activeContract) {
                return reply.code(409).send({
                    success: false,
                    error: 'Bu obyekt üzrə artıq aktiv müqavilə mövcuddur',
                    code: 'PROPERTY_ALREADY_OCCUPIED',
                })
            }
        }

        // Warn if a DRAFT contract exists for this property
        let draftContract: { id: string; number: string } | null = null
        if (rest.propertyId) {
            draftContract = await fastify.prisma.contract.findFirst({
                where: { propertyId: rest.propertyId as string, status: 'DRAFT', deletedAt: null, ...withOrg(req) },
                select: { id: true, number: true },
            })
        }

        // Contract creation + audit log are atomic: if audit log insert fails,
        // the contract is rolled back too. Listing sync is intentionally outside
        // this transaction — it is best-effort and must not roll back a valid contract.
        const contract = await fastify.prisma.$transaction(async (tx) => {
            const created = await tx.contract.create({
                data: {
                    ...rest,
                    tenantId: tenantId!,
                    ...withOrg(req),
                    monthlyRent,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                } as never,
            })

            if (firstPeriodAmount !== undefined) {
                await tx.payment.create({
                    data: {
                        contractId: created.id,
                        organizationId: created.organizationId,
                        amount: 0,
                        expectedAmount: firstPeriodAmount,
                        status: 'UNPAID',
                        periodMonth: new Date(startDate).getMonth() + 1,
                        periodYear: new Date(startDate).getFullYear(),
                        paymentType: 'CASH',
                        paymentDate: new Date(startDate),
                        isPenalty: false,
                        createdBy: null,
                    } as never,
                })
            }

            await writeAuditLog(tx, {
                organizationId: req.user.organizationId,
                userId: req.user.sub,
                action: 'CREATE_CONTRACT',
                entityType: 'Contract',
                entityId: created.id,
            })

            return created
        })

        // Best-effort: sync linked listing's contract dates and availStatus.
        // Must run outside the contract transaction — a PostgreSQL transaction cannot
        // recover from a statement-level error, so try/catch inside $transaction
        // does not prevent rollback. Failure here is non-critical: the contract is
        // already committed and the listing will simply show stale dates until next update.
        if (rest.propertyId) {
            try {
                const activeListing = await fastify.prisma.listing.findFirst({
                    where: { propertyId: rest.propertyId as string, status: 'ACTIVE', deletedAt: null },
                    select: { id: true, availStatus: true },
                })
                if (activeListing) {
                    await fastify.prisma.listing.update({
                        where: { id: activeListing.id },
                        data: {
                            contractStartDate: new Date(startDate),
                            contractEndDate: new Date(endDate),
                            ...(activeListing.availStatus === 'BOSHDUR' ? { availStatus: 'BOSHALIR' } : {}),
                        },
                    })
                }
            } catch (err) {
                fastify.log.warn(
                    { err, propertyId: rest.propertyId, contractId: contract.id },
                    'Listing sync failed after contract create — non-critical, contract is committed'
                )
            }
        }

        return reply.code(201).send({
            success: true,
            data: contract,
            ...(draftContract ? { warning: 'Bu obyekt üzrə qaralama müqavilə mövcuddur' } : {}),
        })
    })

    // PATCH /contracts/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }

        // Fetch old contract first for immutable check and price/endDate logic
        const old = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!old) return reply.code(404).send({ success: false, error: 'Contract not found' })


        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { endDate, startDate, monthlyRent, effectiveFrom, fixedPaymentDay, ...rest } = body.data
        const priceChanged = monthlyRent !== undefined && Number(monthlyRent) !== Number(old.monthlyRent)

        // require effectiveFrom when price changes
        if (priceChanged && !effectiveFrom) {
            return reply.code(400).send({ success: false, error: 'Yeni qiymət üçün keçərli ay göstərilməlidir' })
        }

        const data: Record<string, unknown> = { ...rest }
        if (monthlyRent !== undefined) data['monthlyRent'] = monthlyRent
        if (startDate !== undefined) data['startDate'] = new Date(startDate)
        if (endDate !== undefined) data['endDate'] = new Date(endDate)
        // Sync paymentMode with fixedPaymentDay when provided
        if (fixedPaymentDay !== undefined) {
            data['fixedPaymentDay'] = fixedPaymentDay
            data['paymentMode'] = fixedPaymentDay ? 'FIXED_DAY' : 'CALENDAR'
        }

        const contract = await fastify.prisma.$transaction(async (tx) => {
            const updated = await tx.contract.update({
                where: { id, ...withOrg(req) },
                data: data as Prisma.ContractUncheckedUpdateInput,
            })

            if (body.data.status === 'ACTIVE' && updated.propertyId) {
                await tx.property.update({
                    where: { id: updated.propertyId },
                    data: { status: 'OCCUPIED' },
                })
            }

            // Update UNPAID payments when price changes
            if (priceChanged && effectiveFrom) {
                const { month: effMonth, year: effYear } = effectiveFrom
                await tx.payment.updateMany({
                    where: {
                        contractId: id,
                        status: 'UNPAID',
                        OR: [
                            { periodYear: { gt: effYear } },
                            { periodYear: effYear, periodMonth: { gte: effMonth } },
                        ],
                    },
                    data: { expectedAmount: monthlyRent },
                })
                await writeAuditLog(tx, {
                    organizationId: req.user.organizationId,
                    userId: req.user.sub,
                    action: 'CONTRACT_PRICE_CHANGED',
                    entityType: 'Contract',
                    entityId: id,
                    metadata: {
                        oldPrice: Number(old.monthlyRent),
                        newPrice: monthlyRent,
                        effectiveFrom,
                    },
                })
            }

            // endDate shrink/extend logic
            if (endDate !== undefined) {
                const newEnd = new Date(endDate)
                const oldEnd = new Date(old.endDate)
                if (newEnd < oldEnd) {
                    const newEndYear = newEnd.getFullYear()
                    const newEndMonth = newEnd.getMonth() + 1
                    const deleted = await tx.payment.deleteMany({
                        where: {
                            contractId: id,
                            status: 'UNPAID',
                            OR: [
                                { periodYear: { gt: newEndYear } },
                                { periodYear: newEndYear, periodMonth: { gt: newEndMonth } },
                            ],
                        },
                    })
                    await writeAuditLog(tx, {
                        organizationId: req.user.organizationId,
                        userId: req.user.sub,
                        action: 'CONTRACT_END_DATE_CHANGED',
                        entityType: 'Contract',
                        entityId: id,
                        metadata: {
                            oldEndDate: old.endDate.toISOString(),
                            newEndDate: endDate,
                            cancelledPayments: deleted.count,
                        },
                    })
                } else if (newEnd > oldEnd) {
                    await writeAuditLog(tx, {
                        organizationId: req.user.organizationId,
                        userId: req.user.sub,
                        action: 'CONTRACT_END_DATE_CHANGED',
                        entityType: 'Contract',
                        entityId: id,
                        metadata: {
                            oldEndDate: old.endDate.toISOString(),
                            newEndDate: endDate,
                            type: 'EXTENDED',
                        },
                    })
                }
            }

            // General audit log
            await writeAuditLog(tx, {
                organizationId: req.user.organizationId,
                userId: req.user.sub,
                action: 'UPDATE_CONTRACT',
                entityType: 'Contract',
                entityId: updated.id,
                metadata: { oldValue: { monthlyRent: old.monthlyRent, endDate: old.endDate }, newValue: body.data },
            })

            return updated
        })

        return reply.send({ success: true, data: contract })
    })

    // PATCH /contracts/:id/archive
    fastify.patch('/:id/archive', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const contract = await fastify.prisma.$transaction(async (tx) => {
            const archived = await tx.contract.update({
                where: { id, ...withOrg(req) },
                data: { status: 'ARCHIVED' },
            })
            if (archived.propertyId) {
                await tx.property.update({
                    where: { id: archived.propertyId },
                    data: { status: 'VACANT' },
                })
            }
            return archived
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

    // PATCH /contracts/:id/terminate — ACTIVE → TERMINATED (early termination, requires reason)
    fastify.patch('/:id/terminate', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = req.body as { terminationDate?: string; reason?: string }

        if (!body.terminationDate) return reply.code(400).send({ success: false, error: 'terminationDate is required' })
        if (!body.reason || !body.reason.trim()) return reply.code(400).send({ success: false, error: 'reason is required' })

        const exists = await fastify.prisma.contract.findFirst({
            where: { id, ...withOrg(req), status: 'ACTIVE' },
        })
        if (!exists) return reply.code(404).send({ success: false, error: 'Aktiv müqavilə tapılmadı' })

        const contract = await fastify.prisma.$transaction(async (tx) => {
            const terminated = await tx.contract.update({
                where: { id },
                data: { status: 'TERMINATED' },
            })
            if (terminated.propertyId) {
                await tx.property.update({
                    where: { id: terminated.propertyId },
                    data: { status: 'VACANT' },
                })
            }
            return terminated
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'CONTRACT_TERMINATED',
            entityType: 'Contract',
            entityId: id,
            metadata: { terminationDate: body.terminationDate, reason: body.reason },
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

    // DELETE /contracts/:id
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        await fastify.prisma.contract.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'DELETE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.code(204).send()
    })

    // PATCH /contracts/:id/restore
    fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        await fastify.prisma.contract.update({
            where: { id },
            data: { deletedAt: null }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'RESTORE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.send({ success: true })
    })

    // ── Contract Documents ──────────────────────────────────────────
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
        process.env['SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_KEY']!
    )

    // GET /contracts/:id/documents
    fastify.get('/:id/documents', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const docs = await fastify.prisma.contractDocument.findMany({
            where: { contractId: id, deletedAt: null },
            orderBy: { uploadedAt: 'desc' },
        })
        return reply.send({ success: true, data: docs })
    })

    // POST /contracts/:id/documents
    fastify.post('/:id/documents', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
        ]
        if (!allowedMimes.includes(data.mimetype)) {
            return reply.code(400).send({ success: false, error: 'Yalniz PDF, DOC, DOCX, XLSX, JPG, PNG yukleye bilersiniz' })
        }

        const fileBuffer = await data.toBuffer()
        if (fileBuffer.length > 5 * 1024 * 1024) {
            return reply.code(400).send({ success: false, error: 'Maximum fayl olcusu 5MB olmalidir' })
        }

        const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${id}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('contract-documents')
            .upload(storagePath, fileBuffer, { contentType: data.mimetype, upsert: false })

        if (uploadError) {
            fastify.log.error(uploadError)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('contract-documents').getPublicUrl(storagePath)

        const fields = data.fields as Record<string, any>
        const docType = fields['type']?.value || 'OTHER'
        const rawTitle = fields['title']?.value || ''
        const docTitle = rawTitle || `${docTypeLabel(docType)} - ${new Date().toLocaleDateString('az-AZ')}`
        const docNotes = fields['notes']?.value || null

        const doc = await fastify.prisma.contractDocument.create({
            data: {
                contractId: id,
                type: docType,
                title: docTitle,
                fileUrl: publicUrl,
                fileName: data.filename,
                fileSize: fileBuffer.length,
                uploadedBy: req.user.sub,
                notes: docNotes,
            },
        })

        return reply.code(201).send({ success: true, data: doc })
    })

    // PATCH /contracts/:id/documents/:docId
    fastify.patch('/:id/documents/:docId', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id, docId } = req.params as { id: string; docId: string }
        const body = req.body as { title?: string; notes?: string }

        const doc = await fastify.prisma.contractDocument.findFirst({
            where: { id: docId, contractId: id, deletedAt: null }
        })
        if (!doc) return reply.code(404).send({ success: false, error: 'Document not found' })

        const updated = await fastify.prisma.contractDocument.update({
            where: { id: docId },
            data: {
                title: body.title ?? doc.title,
                notes: body.notes ?? doc.notes,
            },
        })
        return reply.send({ success: true, data: updated })
    })

    // DELETE /contracts/:id/documents/:docId (soft delete)
    fastify.delete('/:id/documents/:docId', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id, docId } = req.params as { id: string; docId: string }
        await fastify.prisma.contractDocument.updateMany({
            where: { id: docId, contractId: id },
            data: { deletedAt: new Date() },
        })
        return reply.code(204).send()
    })
    // ─────────────────────────────────────────
    // POST /contracts/scan-document - AI document scan (server-side, no API key in browser)
    // ─────────────────────────────────────────
    fastify.post('/scan-document', {
        preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])],
    }, async (req, reply) => {
        try {
            const data = await req.file()
            if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

            const buffer = await data.toBuffer()
            const MAX_SIZE = 10 * 1024 * 1024 // 10MB
            if (buffer.length > MAX_SIZE) {
                return reply.code(413).send({ success: false, error: 'Fayl həcmi 10MB-dan çox ola bilməz' })
            }
            const mimetype = data.mimetype
            const filename = data.filename?.toLowerCase() ?? ''

            let textContent = ''

            if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
                try {
                    const { PDFParse } = await import('pdf-parse')
                    const parser = new PDFParse({ data: buffer })
                    const pdfData = await parser.getText()
                    textContent = pdfData.text
                } catch {
                    return reply.code(422).send({ success: false, error: 'PDF oxuna bilmədi' })
                }
            } else if (
                mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                filename.endsWith('.docx')
            ) {
                try {
                    const mammoth = await import('mammoth')
                    const result = await mammoth.extractRawText({ buffer })
                    textContent = result.value
                } catch {
                    return reply.code(422).send({ success: false, error: 'DOCX oxuna bilmədi' })
                }
            } else if (mimetype === 'text/plain' || filename.endsWith('.txt')) {
                textContent = buffer.toString('utf-8')
            } else {
                return reply.code(415).send({ success: false, error: 'Dəstəklənməyən fayl formatı. PDF, DOCX və ya TXT yükləyin.' })
            }

            if (!textContent.trim()) {
                return reply.code(422).send({ success: false, error: 'Fayldan mətn oxuna bilmədi' })
            }

            const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })
            const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 800,
                system: 'Extract from rental contract. Return ONLY valid JSON with no explanation. Fields: tenantName (string), fin (string, 7-char Azerbaijani ID), voen (string, 10-char tax ID), phone (string), propertyAddress (string), monthlyRent (number or null), startDate (YYYY-MM-DD or null), endDate (YYYY-MM-DD or null), depositAmount (number or null), contractNumber (string). Use null if unknown.',
                messages: [{ role: 'user', content: textContent.slice(0, 8000) }],
            })

            const firstBlock = message.content[0]
            const responseText = firstBlock && firstBlock.type === 'text' ? firstBlock.text : ''
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (!jsonMatch) return reply.code(422).send({ success: false, error: 'AI cavab JSON qaytarmadı' })

            const extracted = JSON.parse(jsonMatch[0])
            return reply.send({ success: true, data: extracted })
        } catch (err: any) {
            fastify.log.error(err, '[ScanDocument] Error')
            return reply.code(500).send({ success: false, error: 'Sənəd skan zamanı xəta baş verdi' })
        }
    })

    // ─────────────────────────────────────────
    // POST /contracts/senad-ustasi/usage - Increment AI generation counter
    // ─────────────────────────────────────────
    fastify.post('/senad-ustasi/usage', { preHandler: [authenticate] }, async (req, reply) => {
        const orgId = req.user.organizationId;
        if (!orgId) return reply.code(403).send({ success: false, error: 'No organization attached' });

        const org = await fastify.prisma.organization.findUnique({
            where: { id: orgId },
            select: { senadUstasiUsedMonth: true, senadUstasiResetDate: true, plan: true }
        });

        if (!org) return reply.code(404).send({ success: false, error: 'Organization not found' });

        const now = new Date();
        const resetDate = org.senadUstasiResetDate ? new Date(org.senadUstasiResetDate) : new Date(now.getFullYear(), now.getMonth(), 1);

        let usedCount = org.senadUstasiUsedMonth || 0;
        let newResetDate = org.senadUstasiResetDate;

        // Reset if a new month has started since the last reset date
        if (!org.senadUstasiResetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            usedCount = 0;
            // Set reset date to the first day of the current month
            newResetDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const PLAN_LIMITS = {
            FREE_TRIAL:   { senadUstasi: false, senadLimit: 0    as number | null },
            FREE:         { senadUstasi: false, senadLimit: 0    as number | null },
            BASHLANQIC:   { senadUstasi: false, senadLimit: 0    as number | null },
            PROFESSIONAL: { senadUstasi: true,  senadLimit: 30   as number | null },
            BIZNES:       { senadUstasi: true,  senadLimit: 30   as number | null },
            KORPORATIV:   { senadUstasi: true,  senadLimit: null as number | null },
        } as const satisfies Record<string, { senadUstasi: boolean; senadLimit: number | null }>;
        // Fallback handles any unknown future plan safely without hiding missing entries
        const planLimits = (PLAN_LIMITS as Record<string, { senadUstasi: boolean; senadLimit: number | null }>)[org.plan]
            ?? { senadUstasi: false, senadLimit: 0 };

        if (!planLimits.senadUstasi || (planLimits.senadLimit !== null && usedCount >= planLimits.senadLimit)) {
            return reply.code(403).send({ success: false, error: 'Plan limit reached for Sənəd Ustası' });
        }

        const updatedOrg = await fastify.prisma.organization.update({
            where: { id: orgId },
            data: {
                senadUstasiUsedMonth: usedCount + 1,
                senadUstasiResetDate: newResetDate
            },
            select: { senadUstasiUsedMonth: true, senadUstasiResetDate: true }
        });

        return reply.send({ success: true, data: updatedOrg });
    });
}

function docTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        ACT: 'Akt',
        NOTIFICATION: 'Bildiri\u015f',
        ADDENDUM: '\u018flav\u0259',
        INVOICE: 'Hesab-faktura',
        OTHER: 'S\u0259n\u0259d',
    }
    return labels[type] || 'S\u0259n\u0259d'
}

export default contractsRoutes

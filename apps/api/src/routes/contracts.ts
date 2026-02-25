import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'

const createSchema = z.object({
    number: z.string().min(1),
    propertyId: z.string().min(1),
    tenantId: z.string().min(1),
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
                    { tenant: { fullName: { contains: search, mode: 'insensitive' as const } } },
                    { property: { name: { contains: search, mode: 'insensitive' as const } } },
                ],
            } : {}),
        }

        const [contracts, total] = await Promise.all([
            fastify.prisma.contract.findMany({
                where,
                include: {
                    property: { select: { id: true, number: true, name: true, address: true } },
                    tenant: { select: { id: true, fullName: true, phone: true, email: true } },
                    _count: { select: { payments: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.contract.count({ where }),
        ])

        // Добавляем computed debt для каждого контракта
        const contractsWithDebt = await Promise.all(contracts.map(async (c: any) => {
            if (c.status !== 'ACTIVE') return { ...c, debt: 0 }

            const totalPaidAgg = await fastify.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { contractId: c.id },
            })
            const totalPaid = Number(totalPaidAgg._sum.amount ?? 0)

            const now = new Date()
            const start = new Date(c.startDate)
            const end = c.endDate < now ? new Date(c.endDate) : now
            const monthsElapsed = Math.max(0,
                (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
            )
            const totalExpected = Number(c.monthlyRent) * monthsElapsed
            return { ...c, debt: Math.max(0, totalExpected - totalPaid) }
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

        const { startDate, endDate, monthlyRent, ...rest } = body.data
        const contract = await fastify.prisma.contract.create({
            data: {
                ...rest,
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
}

export default contractsRoutes

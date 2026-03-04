import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { calculateContractDebtAndExpected } from '../utils/contractUtils.js'

const commonFields = {
    phone: z.string().regex(/^\+994\d{9}$/, 'Must be in +994XXXXXXXXX format').optional().or(z.literal('')),
    phone2: z.string().regex(/^\+994\d{9}$/, 'Must be in +994XXXXXXXXX format').optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
    isBlacklisted: z.coerce.boolean().default(false),
    blacklistReason: z.string().optional(),
}

const fizikiSchema = z.object({
    tenantType: z.literal('fiziki'),
    firstName: z.string().min(1, 'Ad daxil edilməlidir'),
    lastName: z.string().min(1, 'Soyad daxil edilməlidir'),
    fatherName: z.string().optional(),
    fin: z.string().length(7, 'FİN 7 simvol olmalıdır').optional().or(z.literal('')),
    passportSeries: z.string().regex(/^[A-Z]{2}\d{7}$/, 'Format: AA1234567').optional().or(z.literal('')),
    passportIssuedBy: z.string().optional(),
    passportIssuedAt: z.string().date().optional().or(z.literal('')),
    birthDate: z.string().date().optional().or(z.literal('')),
    ...commonFields,
})

const huquqiSchema = z.object({
    tenantType: z.literal('huquqi'),
    companyName: z.string().min(1, 'Şirkət adı daxil edilməlidir'),
    voen: z.string().regex(/^\d{10}$/, 'VÖEN 10 rəqəm olmalıdır').optional().or(z.literal('')),
    directorName: z.string().optional(),
    companyAddress: z.string().optional(),
    bankName: z.string().optional(),
    bankCode: z.string().optional(),
    iban: z.string().regex(/^AZ\d{2}[A-Z]{4}[A-Z0-9]{20}$/).optional().or(z.literal('')),
    ...commonFields,
})

const createSchema = z.discriminatedUnion('tenantType', [fizikiSchema, huquqiSchema])
const updateSchema = z.union([fizikiSchema.partial(), huquqiSchema.partial()])


const tenantsRoutes: FastifyPluginAsync = async (fastify) => {
    const supabase = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_SERVICE_KEY'] ?? '',
    )

    // GET /tenants
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const search = (req.query as Record<string, string>)['search']
        const deleted = (req.query as Record<string, string>)['deleted'] === 'true'
        const tenants = await fastify.prisma.tenant.findMany({
            where: {
                ...withOrg(req),
                deletedAt: deleted ? { not: null } : null,
                ...(search ? {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { companyName: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search } },
                        { voen: { contains: search } },
                        { fin: { contains: search } },
                    ]
                } : {}),
            },
            include: {
                contracts: {
                    where: { status: 'ACTIVE' },
                    include: { property: { select: { name: true, number: true } } },
                },
                _count: { select: { contracts: true } },
            },
            orderBy: { createdAt: 'desc' }, // Switched to createdAt, fullName no longer exists
        })

        const tenantsMapped = tenants.map(t => ({
            ...t,
            fullName: t.tenantType === 'fiziki' ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : t.companyName || '',
        }))

        return reply.send({ success: true, data: tenantsMapped, meta: { total: tenantsMapped.length } })
    })

    // GET /tenants/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const tenant = await fastify.prisma.tenant.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                contracts: {
                    include: {
                        property: { select: { name: true, number: true } },
                        payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
                    },
                    orderBy: { startDate: 'desc' },
                },
            },
        })
        if (!tenant) return reply.code(404).send({ success: false, error: 'Tenant not found' })

        const tenantMapped = {
            ...tenant,
            fullName: tenant.tenantType === 'fiziki' ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : tenant.companyName || '',
        }

        return reply.send({ success: true, data: tenantMapped })
    })

    // POST /tenants
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const tenant = await fastify.prisma.tenant.create({ data: { ...body.data, organizationId: req.user.organizationId } as any })
        return reply.code(201).send({ success: true, data: tenant })
    })

    // PATCH /tenants/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const exists = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Tenant not found' })
        const tenant = await fastify.prisma.tenant.update({ where: { id }, data: body.data as never })
        return reply.send({ success: true, data: tenant })
    })

    // DELETE /tenants/:id
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Tenant not found' })
        const activeContracts = await fastify.prisma.contract.count({ where: { tenantId: id, status: 'ACTIVE' } })
        if (activeContracts > 0) {
            return reply.code(409).send({ success: false, error: 'Cannot delete tenant with active contracts' })
        }
        await fastify.prisma.tenant.update({
            where: { id },
            data: { deletedAt: new Date() }
        })
        return reply.code(204).send()
    })

    // PATCH /tenants/:id/restore
    fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Tenant not found' })

        await fastify.prisma.tenant.update({
            where: { id },
            data: { deletedAt: null }
        })
        return reply.send({ success: true })
    })

    // PATCH /tenants/:id/toggle-status (active/inactive)
    fastify.patch('/:id/toggle-status', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Tenant not found' })
        const updated = await fastify.prisma.tenant.update({
            where: { id },
            data: { isActive: !exists.isActive }
        })
        return reply.send({ success: true, data: { isActive: updated.isActive } })
    })


    // GET /tenants/:id/payments — all payments across tenant's contracts
    fastify.get('/:id/payments', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const tenant = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!tenant) return reply.code(404).send({ success: false, error: 'Tenant not found' })

        const contracts = await fastify.prisma.contract.findMany({
            where: { tenantId: id, ...withOrg(req) },
            select: { id: true, number: true },
        })
        const contractIds = contracts.map(c => c.id)

        const payments = await fastify.prisma.payment.findMany({
            where: { contractId: { in: contractIds } },
            include: { contract: { select: { id: true, number: true, property: { select: { name: true } } } } },
            orderBy: { paymentDate: 'desc' },
            take: 200,
        })

        // Compute debt summary per contract
        const debtSummary = await Promise.all(contracts.map(async (c) => {
            const contractFull = await fastify.prisma.contract.findFirst({
                where: { id: c.id },
                include: { payments: { select: { amount: true } } },
            })
            if (!contractFull) return null
            const now = new Date()
            const totalExpected = calculateContractDebtAndExpected(contractFull, now)
            const totalPaid = contractFull.payments.reduce((s, p) => s + Number(p.amount), 0)
            const debt = Math.max(0, totalExpected - totalPaid)
            return { contractId: c.id, contractNumber: c.number, totalExpected, totalPaid, debt }
        }))

        return reply.send({
            success: true,
            data: payments,
            debtSummary: debtSummary.filter(Boolean),
        })
    })
}

export default tenantsRoutes

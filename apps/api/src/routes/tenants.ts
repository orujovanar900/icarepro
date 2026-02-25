import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const createSchema = z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    email: z.email().optional(),
    voen: z.string().optional(),
})

const updateSchema = createSchema.partial()

const tenantsRoutes: FastifyPluginAsync = async (fastify) => {
    const supabase = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_SERVICE_KEY'] ?? '',
    )

    // GET /tenants
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const search = (req.query as Record<string, string>)['search']
        const tenants = await fastify.prisma.tenant.findMany({
            where: {
                ...withOrg(req),
                ...(search ? {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search } },
                        { voen: { contains: search } },
                    ]
                } : {}),
            },
            include: {
                tenantDocuments: true,
                contracts: {
                    where: { status: 'ACTIVE' },
                    include: { property: { select: { name: true, number: true } } },
                },
                _count: { select: { contracts: true } },
            },
            orderBy: { fullName: 'asc' },
        })
        return reply.send({ success: true, data: tenants, meta: { total: tenants.length } })
    })

    // GET /tenants/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const tenant = await fastify.prisma.tenant.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                tenantDocuments: true,
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
        return reply.send({ success: true, data: tenant })
    })

    // POST /tenants
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const tenant = await fastify.prisma.tenant.create({ data: { ...body.data, ...withOrg(req) } })
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
        await fastify.prisma.tenant.delete({ where: { id } })
        return reply.code(204).send()
    })

    // POST /tenants/:id/documents — multipart → Supabase Storage
    fastify.post('/:id/documents', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.tenant.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Tenant not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const fileBuffer = await data.toBuffer()
        const ext = data.filename.split('.').pop() ?? 'pdf'
        const path = `${req.user.organizationId}/${id}/${Date.now()}.${ext}`

        const { error } = await supabase.storage
            .from('tenant-docs')
            .upload(path, fileBuffer, { contentType: data.mimetype })

        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('tenant-docs').getPublicUrl(path)
        const q = req.query as Record<string, string>

        const doc = await fastify.prisma.tenantDocument.create({
            data: {
                tenantId: id,
                type: (q['type'] as never) ?? 'CONTRACT',
                filePath: publicUrl,
                name: q['name'] ?? data.filename,
            },
        })

        return reply.code(201).send({ success: true, data: doc })
    })
}

export default tenantsRoutes

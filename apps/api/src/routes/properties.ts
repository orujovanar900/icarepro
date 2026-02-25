import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const createSchema = z.object({
    number: z.string().min(1),
    name: z.string().min(1),
    building: z.string().min(1),
    address: z.string().min(1),
    area: z.number().positive(),
})

const updateSchema = createSchema.partial()

const propertiesRoutes: FastifyPluginAsync = async (fastify) => {
    const supabase = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_SERVICE_KEY'] ?? '',
    )

    // GET /properties
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const search = (req.query as Record<string, string>)['search']
        const properties = await fastify.prisma.property.findMany({
            where: {
                ...withOrg(req),
                isActive: true,
                ...(search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { number: { contains: search } },
                        { address: { contains: search, mode: 'insensitive' } },
                    ]
                } : {}),
            },
            include: {
                photos: { orderBy: { sortOrder: 'asc' } },
                meterReadings: { take: 1, orderBy: { readingDate: 'desc' } },
                _count: { select: { contracts: { where: { status: 'ACTIVE' } } } },
            },
            orderBy: { number: 'asc' },
        })
        return reply.send({ success: true, data: properties, meta: { total: properties.length } })
    })

    // GET /properties/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const property = await fastify.prisma.property.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                photos: { orderBy: { sortOrder: 'asc' } },
                meterReadings: { orderBy: { readingDate: 'desc' }, take: 12 },
                contracts: {
                    include: { tenant: { select: { fullName: true, phone: true } } },
                    orderBy: { startDate: 'desc' },
                },
            },
        })
        if (!property) return reply.code(404).send({ success: false, error: 'Property not found' })
        return reply.send({ success: true, data: property })
    })

    // POST /properties
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const property = await fastify.prisma.property.create({ data: { ...body.data, ...withOrg(req) } })
        return reply.code(201).send({ success: true, data: property })
    })

    // PATCH /properties/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })
        const property = await fastify.prisma.property.update({ where: { id }, data: body.data as never })
        return reply.send({ success: true, data: property })
    })

    // DELETE /properties/:id — soft delete
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })
        await fastify.prisma.property.update({ where: { id }, data: { isActive: false } })
        return reply.code(204).send()
    })

    // POST /properties/:id/photos — multipart upload → Supabase Storage
    fastify.post('/:id/photos', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const fileBuffer = await data.toBuffer()
        const ext = data.filename.split('.').pop() ?? 'jpg'
        const path = `${req.user.organizationId}/${id}/${Date.now()}.${ext}`

        const { error } = await supabase.storage
            .from('property-photos')
            .upload(path, fileBuffer, { contentType: data.mimetype, upsert: false })

        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path)

        const caption = (req.query as Record<string, string>)['caption']
        const photo = await fastify.prisma.propertyPhoto.create({
            data: { propertyId: id, url: publicUrl, caption: caption ?? null },
        })

        return reply.code(201).send({ success: true, data: photo })
    })
}

export default propertiesRoutes

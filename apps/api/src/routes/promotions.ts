import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

const createPromotionSchema = z.object({
    type: z.enum(['LED_TICKER', 'FEATURED_LISTING']),
    listingId: z.string().optional().nullable(),
    durationDays: z.number().int().positive().max(365),
    customText: z.string().max(100).optional().nullable(),
})

const promotionsRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /promotions — create a promotion request
    fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
        const body = createPromotionSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const orgId = req.user.organizationId
        if (!orgId) {
            return reply.code(403).send({ success: false, error: 'Bu əməliyyat üçün təşkilat tələb olunur' })
        }

        const data = body.data

        // Validate: FEATURED_LISTING requires listingId
        if (data.type === 'FEATURED_LISTING' && !data.listingId) {
            return reply.code(400).send({ success: false, error: 'Öncülləşdirilmiş elan üçün elan seçilməlidir' })
        }

        // Validate: LED_TICKER requires customText
        if (data.type === 'LED_TICKER' && !data.customText?.trim()) {
            return reply.code(400).send({ success: false, error: 'LED Ticker üçün mətn daxil edilməlidir' })
        }

        // If listingId given, verify it belongs to this org
        if (data.listingId) {
            const listing = await fastify.prisma.listing.findFirst({
                where: { id: data.listingId, organizationId: orgId },
            })
            if (!listing) {
                return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
            }
        }

        const request = await fastify.prisma.promotionRequest.create({
            data: {
                orgId,
                userId: req.user.sub,
                type: data.type,
                listingId: data.listingId ?? null,
                durationDays: data.durationDays,
                customText: data.customText ?? null,
                status: 'PENDING',
            },
        })

        return reply.code(201).send({ success: true, data: request })
    })

    // GET /promotions/mine — list current org's promotion requests
    fastify.get('/mine', { preHandler: [authenticate] }, async (req, reply) => {
        const orgId = req.user.organizationId
        if (!orgId) {
            return reply.code(403).send({ success: false, error: 'Təşkilat tələb olunur' })
        }

        const requests = await fastify.prisma.promotionRequest.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            include: {
                listing: { select: { id: true, title: true } },
                user: { select: { id: true, name: true } },
            },
        })

        return reply.send({ success: true, data: requests })
    })
}

export default promotionsRoutes

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { writeAuditLog } from '../utils/audit.js'

// ── Validation schemas ────────────────────────────────────────────────────────

const slotBodySchema = z.object({
    type:            z.enum(['LISTING', 'AD']),
    content:         z.string().min(1).max(100),
    linkUrl:         z.string().url().optional().nullable(),
    listingId:       z.string().optional().nullable(),
    organizationId:  z.string().optional().nullable(),
    placement:       z.enum(['PORTAL_MAIN', 'LISTING_DETAIL']),
    isActive:        z.boolean().default(true),
    sortOrder:       z.number().int().default(0),
    startDate:       z.string().datetime(),
    endDate:         z.string().datetime(),
    dailyHours:      z.array(z.number().int().min(0).max(23)).default([]),
    maxImpressions:  z.number().int().min(0).default(0),
    dailyLimit:      z.number().int().min(0).default(0),
})

const patchBodySchema = slotBodySchema.partial().extend({
    currentImpressions: z.number().int().min(0).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'Dəyişiklik məlumatı göndərilməyib.',
})

const adminQuerySchema = z.object({
    placement: z.enum(['PORTAL_MAIN', 'LISTING_DETAIL']).optional(),
    isActive:  z.enum(['true', 'false']).optional(),
    type:      z.enum(['LISTING', 'AD']).optional(),
})

const tickerRoutes: FastifyPluginAsync = async (fastify) => {

    // ── PUBLIC: GET /ticker?placement=PORTAL_MAIN ────────────────────────────
    // No auth required. Returns active + in-range + in-hour slots.
    // Increments currentImpressions for each returned slot.
    fastify.get('/', async (req, reply) => {
        const placementParsed = z.enum(['PORTAL_MAIN', 'LISTING_DETAIL'])
            .safeParse((req.query as { placement?: string })['placement'] ?? 'PORTAL_MAIN')
        if (!placementParsed.success) {
            return reply.code(400).send({ success: false, error: 'Yanlış placement dəyəri.' })
        }
        const placement = placementParsed.data

        const now = new Date()
        const currentHour = now.getHours()

        // Fetch candidates: active, within date range
        const candidates = await fastify.prisma.tickerSlot.findMany({
            where: {
                placement,
                isActive:  true,
                startDate: { lte: now },
                endDate:   { gte: now },
            },
            orderBy: { sortOrder: 'asc' },
        })

        const todayStr = now.toISOString().slice(0, 10)

        // Filter by dailyHours, maxImpressions, and dailyLimit in JS
        const eligible = candidates.filter(slot => {
            const hours = slot.dailyHours as number[]
            const inHour = hours.length === 0 || hours.includes(currentHour)
            const underCap = slot.maxImpressions === 0 || slot.currentImpressions < slot.maxImpressions
            const slotTodayStr = slot.todayDate ? (slot.todayDate as Date).toISOString().slice(0, 10) : null
            const effectiveTodayCount = slotTodayStr === todayStr ? slot.todayCount : 0
            const underDailyLimit = slot.dailyLimit === 0 || effectiveTodayCount < slot.dailyLimit
            return inHour && underCap && underDailyLimit
        })

        if (eligible.length === 0) {
            return reply.send({ success: true, data: [] })
        }

        // Increment impressions + daily count per slot (fire and forget)
        for (const slot of eligible) {
            const slotTodayStr = slot.todayDate ? (slot.todayDate as Date).toISOString().slice(0, 10) : null
            const isNewDay = slotTodayStr !== todayStr
            void fastify.prisma.tickerSlot.update({
                where: { id: slot.id },
                data: isNewDay
                    ? { currentImpressions: { increment: 1 }, todayCount: 1, todayDate: now }
                    : { currentImpressions: { increment: 1 }, todayCount: { increment: 1 } },
            }).catch(() => { /* non-critical */ })
        }

        const data = eligible.map(slot => ({
            id:        slot.id,
            type:      slot.type,
            content:   slot.content,
            linkUrl:   slot.linkUrl,
            listingId: slot.listingId,
            placement: slot.placement,
        }))

        return reply.send({ success: true, data })
    })

    // ── ADMIN: GET /ticker/admin ─────────────────────────────────────────────
    fastify.get('/admin', {
        preHandler: [authenticate, requireRole(['SUPERADMIN', 'CONTENT'])],
    }, async (req, reply) => {
        const parsed = adminQuerySchema.safeParse(req.query)
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: parsed.error.issues[0]?.message })
        }
        const { placement, isActive, type } = parsed.data

        const where: Record<string, unknown> = {}
        if (placement)           where['placement'] = placement
        if (isActive !== undefined) where['isActive'] = isActive === 'true'
        if (type)                where['type'] = type

        const slots = await fastify.prisma.tickerSlot.findMany({
            where,
            orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        })

        return reply.send({ success: true, data: slots })
    })

    // ── ADMIN: POST /ticker/admin ────────────────────────────────────────────
    fastify.post('/admin', {
        preHandler: [authenticate, requireRole(['SUPERADMIN', 'CONTENT'])],
    }, async (req, reply) => {
        const parsed = slotBodySchema.safeParse(req.body)
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: parsed.error.issues[0]?.message })
        }
        const body = parsed.data

        if (new Date(body.endDate) <= new Date(body.startDate)) {
            return reply.code(400).send({ success: false, error: 'Bitmə tarixi başlama tarixindən sonra olmalıdır.' })
        }

        const slot = await fastify.prisma.tickerSlot.create({
            data: {
                type:           body.type,
                content:        body.content,
                linkUrl:        body.linkUrl ?? null,
                listingId:      body.listingId ?? null,
                organizationId: body.organizationId ?? null,
                placement:      body.placement,
                isActive:       body.isActive,
                sortOrder:      body.sortOrder,
                startDate:      new Date(body.startDate),
                endDate:        new Date(body.endDate),
                dailyHours:     body.dailyHours,
                maxImpressions: body.maxImpressions,
                dailyLimit:     body.dailyLimit,
                createdBy:      req.user.sub,
            },
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId:         req.user.sub,
            action:         'TICKER_SLOT_CREATED',
            entityType:     'TickerSlot',
            entityId:       slot.id,
            metadata:       { type: slot.type, placement: slot.placement, content: slot.content },
        })

        return reply.code(201).send({ success: true, data: slot })
    })

    // ── ADMIN: PATCH /ticker/admin/:id ───────────────────────────────────────
    fastify.patch('/admin/:id', {
        preHandler: [authenticate, requireRole(['SUPERADMIN', 'CONTENT'])],
    }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const parsed = patchBodySchema.safeParse(req.body)
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: parsed.error.issues[0]?.message })
        }
        const body = parsed.data

        const existing = await fastify.prisma.tickerSlot.findUnique({ where: { id } })
        if (!existing) {
            return reply.code(404).send({ success: false, error: 'Slot tapılmadı.' })
        }

        if (body.startDate && body.endDate && new Date(body.endDate) <= new Date(body.startDate)) {
            return reply.code(400).send({ success: false, error: 'Bitmə tarixi başlama tarixindən sonra olmalıdır.' })
        }

        const updateData: Record<string, unknown> = {}
        if (body.type            !== undefined) updateData['type']            = body.type
        if (body.content         !== undefined) updateData['content']         = body.content
        if (body.linkUrl         !== undefined) updateData['linkUrl']         = body.linkUrl
        if (body.listingId       !== undefined) updateData['listingId']       = body.listingId
        if (body.organizationId  !== undefined) updateData['organizationId']  = body.organizationId
        if (body.placement       !== undefined) updateData['placement']       = body.placement
        if (body.isActive        !== undefined) updateData['isActive']        = body.isActive
        if (body.sortOrder       !== undefined) updateData['sortOrder']       = body.sortOrder
        if (body.startDate       !== undefined) updateData['startDate']       = new Date(body.startDate)
        if (body.endDate         !== undefined) updateData['endDate']         = new Date(body.endDate)
        if (body.dailyHours      !== undefined) updateData['dailyHours']      = body.dailyHours
        if (body.maxImpressions      !== undefined) updateData['maxImpressions']      = body.maxImpressions
        if (body.dailyLimit          !== undefined) updateData['dailyLimit']          = body.dailyLimit
        if (body.currentImpressions  !== undefined) updateData['currentImpressions']  = body.currentImpressions

        const slot = await fastify.prisma.tickerSlot.update({
            where: { id },
            data:  updateData as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId:         req.user.sub,
            action:         'TICKER_SLOT_UPDATED',
            entityType:     'TickerSlot',
            entityId:       slot.id,
            metadata:       updateData,
        })

        return reply.send({ success: true, data: slot })
    })

    // ── ADMIN: DELETE /ticker/admin/:id ──────────────────────────────────────
    fastify.delete('/admin/:id', {
        preHandler: [authenticate, requireRole(['SUPERADMIN', 'CONTENT'])],
    }, async (req, reply) => {
        const { id } = req.params as { id: string }

        const existing = await fastify.prisma.tickerSlot.findUnique({ where: { id } })
        if (!existing) {
            return reply.code(404).send({ success: false, error: 'Slot tapılmadı.' })
        }

        await fastify.prisma.tickerSlot.delete({ where: { id } })

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId:         req.user.sub,
            action:         'TICKER_SLOT_DELETED',
            entityType:     'TickerSlot',
            entityId:       id,
            metadata:       { content: existing.content, placement: existing.placement },
        })

        return reply.send({ success: true })
    })
}

export default tickerRoutes

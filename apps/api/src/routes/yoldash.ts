import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

// ─────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────

const createRoommateAdSchema = z.object({
    displayName: z.string().min(1).max(80),
    age: z.number().int().min(16).max(80),
    gender: z.enum(['MALE', 'FEMALE', 'ANY']),
    districts: z.array(z.string().min(1)).min(1),
    budgetMin: z.number().int().positive(),
    budgetMax: z.number().int().positive(),
    startMonth: z.number().int().min(1).max(12),
    startYear: z.number().int().min(2024).max(2100),
    durationMonths: z.number().int().positive().nullable().optional(),
    isLongTerm: z.boolean().default(false),
    phone: z.string().min(5).max(30),
    whatsapp: z.string().max(30).optional().nullable(),
    telegram: z.string().max(50).optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
    occupation: z.enum(['STUDENT', 'EMPLOYED', 'ENTREPRENEUR', 'OTHER']).optional().nullable(),
    smokes: z.boolean().optional().nullable(),
    hasPets: z.boolean().optional().nullable(),
    schedule: z.enum(['EARLY', 'LATE', 'ANY']).optional().nullable(),
    guests: z.enum(['OFTEN', 'SOMETIMES', 'NEVER']).optional().nullable(),
    description: z.string().max(300).optional().nullable(),
}).refine(d => d.budgetMax >= d.budgetMin, {
    message: 'budgetMax must be >= budgetMin',
    path: ['budgetMax'],
})

// Public card fields (no phone, no contact channels)
const PUBLIC_SELECT = {
    id: true,
    displayName: true,
    age: true,
    gender: true,
    districts: true,
    budgetMin: true,
    budgetMax: true,
    startMonth: true,
    startYear: true,
    durationMonths: true,
    isLongTerm: true,
    occupation: true,
    smokes: true,
    hasPets: true,
    schedule: true,
    guests: true,
    description: true,
    photoUrl: true,
    createdAt: true,
} as const

// ─────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────

const yoldashRoutes: FastifyPluginAsync = async (fastify) => {
    // ══════════════════════════════════════
    // PUBLIC — GET /yoldash (list)
    // ══════════════════════════════════════
    fastify.get('/', async (req, reply) => {
        const q = req.query as Record<string, string>
        const page = Math.max(1, Number(q['page'] ?? 1))
        const limit = Math.min(50, Math.max(1, Number(q['limit'] ?? 20)))
        const offset = (page - 1) * limit

        const now = new Date()
        const where: any = {
            status: 'APPROVED',
            expiresAt: { gt: now },
        }

        if (q['district']) {
            where.districts = { has: q['district'] }
        }
        if (q['gender'] && ['MALE', 'FEMALE', 'ANY'].includes(q['gender'])) {
            where.gender = q['gender']
        }
        if (q['budgetMax']) {
            const max = Number(q['budgetMax'])
            if (!Number.isNaN(max)) where.budgetMin = { lte: max }
        }

        const [data, total] = await Promise.all([
            fastify.prisma.roommateAd.findMany({
                where,
                select: PUBLIC_SELECT,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.roommateAd.count({ where }),
        ])

        return reply.send({
            success: true,
            data,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        })
    })

    // ══════════════════════════════════════
    // AUTH — GET /yoldash/mine  (must be before /:id)
    // ══════════════════════════════════════
    fastify.get('/mine', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = (req.user as any).sub as string
        const ads = await fastify.prisma.roommateAd.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
        return reply.send({ success: true, data: ads })
    })

    // ══════════════════════════════════════
    // PUBLIC — GET /yoldash/:id (single)
    // ══════════════════════════════════════
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params as { id: string }
        const ad = await fastify.prisma.roommateAd.findFirst({
            where: { id, status: 'APPROVED', expiresAt: { gt: new Date() } },
            select: {
                ...PUBLIC_SELECT,
                phone: true,
                whatsapp: true,
                telegram: true,
            },
        })
        if (!ad) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
        return reply.send({ success: true, data: ad })
    })

    // ══════════════════════════════════════
    // AUTH — POST /yoldash/:id/reveal-phone
    // ══════════════════════════════════════
    fastify.post('/:id/reveal-phone', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const ad = await fastify.prisma.roommateAd.findFirst({
            where: { id, status: 'APPROVED', expiresAt: { gt: new Date() } },
            select: { id: true, phone: true },
        })
        if (!ad) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

        fastify.log.info({ roommateAdId: id, viewerId: (req.user as any).sub }, 'yoldash:phone_revealed')

        return reply.send({ success: true, data: { phone: ad.phone } })
    })

    // ══════════════════════════════════════
    // AUTH — POST /yoldash  (create ad, status PENDING)
    // ══════════════════════════════════════
    fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
        const parsed = createRoommateAdSchema.safeParse(req.body)
        if (!parsed.success) return sendZodError(reply, parsed.error)

        const userId = (req.user as any).sub as string
        const body = parsed.data
        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

        const ad = await fastify.prisma.roommateAd.create({
            data: {
                displayName: body.displayName,
                age: body.age,
                gender: body.gender,
                districts: body.districts,
                budgetMin: body.budgetMin,
                budgetMax: body.budgetMax,
                startMonth: body.startMonth,
                startYear: body.startYear,
                durationMonths: body.isLongTerm ? null : (body.durationMonths ?? null),
                isLongTerm: body.isLongTerm,
                phone: body.phone,
                whatsapp: body.whatsapp ?? null,
                telegram: body.telegram ?? null,
                photoUrl: body.photoUrl ?? null,
                occupation: body.occupation ?? null,
                smokes: body.smokes ?? null,
                hasPets: body.hasPets ?? null,
                schedule: body.schedule ?? null,
                guests: body.guests ?? null,
                description: body.description ?? null,
                status: 'PENDING',
                userId,
                expiresAt,
            },
        })

        return reply.code(201).send({ success: true, data: ad })
    })

    // ══════════════════════════════════════
    // AUTH — DELETE /yoldash/:id (owner only)
    // ══════════════════════════════════════
    fastify.delete('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const userId = (req.user as any).sub as string

        const ad = await fastify.prisma.roommateAd.findUnique({
            where: { id },
            select: { id: true, userId: true },
        })
        if (!ad) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
        if (ad.userId !== userId) return reply.code(403).send({ success: false, error: 'Yalnız öz elanınızı silə bilərsiniz' })

        await fastify.prisma.roommateAd.delete({ where: { id } })
        return reply.send({ success: true })
    })
}

export default yoldashRoutes

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Simple in-memory rate limiter: max 20 chat requests per org per hour
const chatRateMap = new Map<string, { count: number; resetAt: number }>()
function checkChatRateLimit(orgId: string): boolean {
    const now = Date.now()
    const entry = chatRateMap.get(orgId)
    if (!entry || entry.resetAt < now) {
        chatRateMap.set(orgId, { count: 1, resetAt: now + 60 * 60 * 1000 })
        return true
    }
    if (entry.count >= 20) return false
    entry.count++
    return true
}

const chatBodySchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
    })).min(1).max(50),
    systemPrompt: z.string().max(4000).optional(),
})

const scanBodySchema = z.object({
    text: z.string().min(1).max(10000),
    systemPrompt: z.string().max(2000).optional(),
})

const aiRoutes: FastifyPluginAsync = async (fastify) => {
    const apiKey = process.env['ANTHROPIC_API_KEY']

    // POST /ai/chat — SupportChat proxy (claude-haiku-4-5)
    fastify.post('/chat', { preHandler: [authenticate] }, async (req, reply) => {
        if (!apiKey) {
            return reply.code(503).send({ success: false, error: 'AI service not configured' })
        }

        const body = chatBodySchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const orgId = req.user.organizationId ?? req.user.sub
        if (!checkChatRateLimit(orgId)) {
            return reply.code(429).send({ success: false, error: 'Saatda maksimum 20 AI sorğusuna çatdınız. Bir saat sonra yenidən cəhd edin.' })
        }

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 500,
                    temperature: 0.7,
                    ...(body.data.systemPrompt ? { system: body.data.systemPrompt } : {}),
                    messages: body.data.messages,
                }),
            })

            if (!response.ok) {
                const errText = await response.text()
                fastify.log.error(`[AI/chat] Anthropic error ${response.status}: ${errText}`)
                return reply.code(502).send({ success: false, error: 'AI xidməti cavab vermədi' })
            }

            const data = await response.json() as { content?: { text: string }[] }
            const content = data.content?.[0]?.text ?? ''
            return reply.send({ success: true, content })
        } catch (err) {
            fastify.log.error(`[AI/chat] fetch error: ${err}`)
            return reply.code(502).send({ success: false, error: 'AI xidməti ilə əlaqə xətası' })
        }
    })

    // POST /ai/scan — Document scan proxy (claude-haiku-4-5)
    // Used by Sənəd Ustası to extract contract data from uploaded files
    fastify.post('/scan', { preHandler: [authenticate] }, async (req, reply) => {
        if (!apiKey) {
            return reply.code(503).send({ success: false, error: 'AI service not configured' })
        }

        const body = scanBodySchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const systemPrompt = body.data.systemPrompt ??
            'Extract from rental contract. Return ONLY valid JSON, no other text. Fields: tenantName, finOrVoen, phone, propertyAddress, monthlyRent, startDate (ISO), endDate (ISO), depositAmount. If unknown, use empty string.'

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 800,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: body.data.text }],
                }),
            })

            if (!response.ok) {
                const errText = await response.text()
                fastify.log.error(`[AI/scan] Anthropic error ${response.status}: ${errText}`)
                return reply.code(502).send({ success: false, error: 'AI xidməti cavab vermədi' })
            }

            const data = await response.json() as { content?: { text: string }[] }
            const content = data.content?.[0]?.text ?? '{}'
            return reply.send({ success: true, content })
        } catch (err) {
            fastify.log.error(`[AI/scan] fetch error: ${err}`)
            return reply.code(502).send({ success: false, error: 'AI xidməti ilə əlaqə xətası' })
        }
    })

    // POST /ai/document — Sənəd Ustası document generation proxy (claude-haiku-4-5)
    fastify.post('/document', { preHandler: [authenticate] }, async (req, reply) => {
        if (!apiKey) {
            return reply.code(503).send({ success: false, error: 'AI service not configured' })
        }

        const body = chatBodySchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 1000,
                    ...(body.data.systemPrompt ? { system: body.data.systemPrompt } : {}),
                    messages: body.data.messages,
                }),
            })

            if (!response.ok) {
                const errText = await response.text()
                fastify.log.error(`[AI/document] Anthropic error ${response.status}: ${errText}`)
                return reply.code(502).send({ success: false, error: 'AI xidməti cavab vermədi' })
            }

            const data = await response.json() as { content?: { text: string }[] }
            const content = data.content?.[0]?.text ?? ''
            return reply.send({ success: true, content })
        } catch (err) {
            fastify.log.error(`[AI/document] fetch error: ${err}`)
            return reply.code(502).send({ success: false, error: 'AI xidməti ilə əlaqə xətası' })
        }
    })
}

export default aiRoutes

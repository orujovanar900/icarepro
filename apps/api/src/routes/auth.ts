import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

const BCRYPT_ROUNDS = 12

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /auth/login — rate limit: 5/min
    fastify.post('/login', {
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    }, async (req, reply) => {
        const body = loginSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { email, password } = body.data

        // Ищем пользователя — email глобально уникален внутри организации.
        // Для SaaS входа ищем без organizationId (первый аккаунт с этим email)
        const user = await fastify.prisma.user.findFirst({
            where: { email, isActive: true },
            include: {
                organization: {
                    select: { id: true, name: true, plan: true, isActive: true },
                },
            },
        })

        if (!user || !user.organization.isActive) {
            return reply.code(401).send({ success: false, error: 'Invalid credentials' })
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            return reply.code(401).send({ success: false, error: 'Invalid credentials' })
        }

        const token = fastify.jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            name: user.name,
        })

        reply.setCookie('token', token, {
            httpOnly: true,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        })

        return reply.send({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organization: user.organization,
                },
            },
        })
    })

    // POST /auth/logout
    fastify.post('/logout', async (_req, reply) => {
        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true })
    })

    // GET /auth/me
    fastify.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
        const user = await fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: {
                id: true, email: true, name: true, role: true,
                isActive: true, createdAt: true,
                organization: { select: { id: true, name: true, plan: true } },
            },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })
        return reply.send({ success: true, data: user })
    })

    // POST /auth/change-password
    fastify.post('/change-password', { preHandler: [authenticate] }, async (req, reply) => {
        const body = changePasswordSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const user = await fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: { passwordHash: true },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

        const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash)
        if (!valid) {
            return reply.code(401).send({ success: false, error: 'Current password is incorrect' })
        }

        const newHash = await bcrypt.hash(body.data.newPassword, BCRYPT_ROUNDS)
        await fastify.prisma.user.update({
            where: { id: req.user.sub },
            data: { passwordHash: newHash },
        })

        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true })
    })
}

export default authRoutes

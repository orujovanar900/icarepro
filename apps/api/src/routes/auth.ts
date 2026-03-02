import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { sendPasswordReset } from '../services/email.js'

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MINUTES = 15
const RESET_TOKEN_TTL_HOURS = 1

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
})

const registerSchema = z.object({
    entityType: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    organizationName: z.string().optional(),
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
})

const changeEmailSchema = z.object({
    currentPassword: z.string().min(1),
    newEmail: z.string().email(),
})

const forgotPasswordSchema = z.object({
    email: z.string().email(),
})

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
    // ─────────────────────────────────────────
    // POST /auth/register — create org + owner account
    // ─────────────────────────────────────────
    fastify.post('/register', {
        config: {
            rateLimit: {
                max: 3,
                timeWindow: '1 hour',
                errorResponseBuilder: () => ({
                    success: false,
                    error: 'Qeydiyyat limiti aşıldı. 1 saat gözləyin.',
                }),
            }
        },
    }, async (req, reply) => {
        const body = registerSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { name, email, password, organizationName, entityType } = body.data

        // If INDIVIDUAL or organizationName is omitted, use the user's name as their org
        const finalOrgName = (entityType === 'INDIVIDUAL' || !organizationName) ? name : organizationName;

        // Check for duplicate email
        const existing = await fastify.prisma.user.findFirst({ where: { email } })
        if (existing) {
            return reply.code(409).send({ success: false, error: 'Bu e-poşt artıq qeydiyyatdan keçib' })
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

        // Generate a URL-safe slug from org name + random suffix for uniqueness
        const baseSlug = finalOrgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'org'
        const slug = `${baseSlug}-${crypto.randomBytes(4).toString('hex')}`

        // Create Org + Owner User in a transaction
        const { user, org } = await fastify.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: finalOrgName,
                    slug,
                    plan: 'FREE',
                    isActive: true,
                },
            })
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    role: 'OWNER',
                    organizationId: org.id,
                    isActive: true,
                    jwtVersion: 1,
                },
                include: { organization: { select: { id: true, name: true, plan: true, isActive: true } } },
            })
            return { user, org }
        })

        const token = fastify.jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: org.id,
            name: user.name,
            jwtVersion: user.jwtVersion,
            avatarUrl: user.avatarUrl,
        })

        reply.setCookie('token', token, {
            httpOnly: true,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        })

        return reply.code(201).send({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                    organization: user.organization,
                },
            },
        })
    })

    // ─────────────────────────────────────────
    // POST /auth/login — rate limit: 5/min + account lockout
    // ─────────────────────────────────────────
    fastify.post('/login', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '15 minutes',
                errorResponseBuilder: () => ({
                    success: false,
                    error: 'Çox sayda giriş cəhdi. 15 dəqiqə gözləyin.',
                }),
            }
        },
    }, async (req, reply) => {
        const body = loginSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { email, password } = body.data

        const user = await fastify.prisma.user.findFirst({
            where: { email, isActive: true },
            include: {
                organization: {
                    select: { id: true, name: true, plan: true, isActive: true },
                },
            },
        })

        if (!user || !user.organization?.isActive) {
            return reply.code(401).send({ success: false, error: 'Məlumatlar yanlışdır' })
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
            return reply.code(423).send({
                success: false,
                error: `Hesab müvəqqəti bloklanıb. ${minutesLeft} dəqiqə sonra yenidən cəhd edin.`,
            })
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            const newAttempts = user.failedAttempts + 1
            const lockData = newAttempts >= MAX_FAILED_ATTEMPTS
                ? {
                    failedAttempts: newAttempts,
                    lockedUntil: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
                }
                : { failedAttempts: newAttempts }

            await fastify.prisma.user.update({ where: { id: user.id }, data: lockData })

            const remaining = MAX_FAILED_ATTEMPTS - newAttempts
            if (remaining <= 0) {
                return reply.code(423).send({
                    success: false,
                    error: `Hesab ${LOCK_DURATION_MINUTES} dəqiqəlik bloklandı.`,
                })
            }
            return reply.code(401).send({
                success: false,
                error: `Məlumatlar yanlışdır. ${remaining} cəhd qalıb.`,
            })
        }

        // Successful login — reset failed attempts
        await fastify.prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
        })

        const token = fastify.jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            name: user.name,
            jwtVersion: user.jwtVersion,
            avatarUrl: user.avatarUrl,
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
                    avatarUrl: user.avatarUrl,
                    organization: user.organization,
                },
            },
        })
    })

    // ─────────────────────────────────────────
    // POST /auth/logout
    // ─────────────────────────────────────────
    fastify.post('/logout', async (_req, reply) => {
        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true })
    })

    // ─────────────────────────────────────────
    // POST /auth/logout-all
    // ─────────────────────────────────────────
    fastify.post('/logout-all', { preHandler: [authenticate] }, async (req, reply) => {
        await fastify.prisma.user.update({
            where: { id: req.user.sub },
            data: { jwtVersion: { increment: 1 } }
        })
        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true, message: 'Bütün cihazlardan çıxış edildi' })
    })

    // ─────────────────────────────────────────
    // GET /auth/me
    // ─────────────────────────────────────────
    fastify.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
        const user = await fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: {
                id: true, email: true, name: true, role: true, phone: true,
                isActive: true, createdAt: true, telegramChatId: true, avatarUrl: true,
                organization: { select: { id: true, name: true, plan: true } },
            },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })
        return reply.send({ success: true, data: user })
    })

    // ─────────────────────────────────────────
    // POST /auth/change-password
    // ─────────────────────────────────────────
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
            return reply.code(401).send({ success: false, error: 'Mövcud şifrə yanlışdır' })
        }

        const newHash = await bcrypt.hash(body.data.newPassword, BCRYPT_ROUNDS)
        await fastify.prisma.user.update({
            where: { id: req.user.sub },
            data: { passwordHash: newHash },
        })

        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true })
    })

    // ─────────────────────────────────────────
    // POST /auth/change-email
    // ─────────────────────────────────────────
    fastify.post('/change-email', { preHandler: [authenticate, requireRole(['OWNER'])] }, async (req, reply) => {
        const body = changeEmailSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const user = await fastify.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: { passwordHash: true, organizationId: true },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

        const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash)
        if (!valid) {
            return reply.code(401).send({ success: false, error: 'Mövcud şifrə yanlışdır' })
        }

        // Check email not in use in same org
        const existing = await fastify.prisma.user.findFirst({
            where: { email: body.data.newEmail, organizationId: user.organizationId },
        })
        if (existing) {
            return reply.code(409).send({ success: false, error: 'Bu email artıq istifadə olunur' })
        }

        await fastify.prisma.user.update({
            where: { id: req.user.sub },
            data: { email: body.data.newEmail },
        })

        reply.clearCookie('token', { path: '/' })
        return reply.send({ success: true })
    })

    // ─────────────────────────────────────────
    // POST /auth/forgot-password
    // ─────────────────────────────────────────
    fastify.post('/forgot-password', {
        config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
    }, async (req, reply) => {
        const body = forgotPasswordSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const user = await fastify.prisma.user.findFirst({
            where: { email: body.data.email, isActive: true },
        })

        // Always return success to prevent email enumeration
        if (!user) {
            return reply.send({ success: true, message: 'Əgər bu email sistemdə varsa, link göndəriləcək.' })
        }

        const token = crypto.randomBytes(32).toString('hex')
        const expiry = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000)

        await fastify.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: token, passwordResetExpiry: expiry },
        })

        const frontendUrl = process.env['FRONTEND_URL'] || 'https://icare-pro-afd3bf.netlify.app'
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`

        try {
            await sendPasswordReset(user.email, resetUrl)
        } catch (err) {
            fastify.log.error(err, 'Failed to send password reset email')
        }

        return reply.send({ success: true, message: 'Əgər bu email sistemdə varsa, link göndəriləcək.' })
    })

    // ─────────────────────────────────────────
    // POST /auth/reset-password
    // ─────────────────────────────────────────
    fastify.post('/reset-password', async (req, reply) => {
        const body = resetPasswordSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const user = await fastify.prisma.user.findFirst({
            where: {
                passwordResetToken: body.data.token,
                passwordResetExpiry: { gt: new Date() },
                isActive: true,
            },
        })

        if (!user) {
            return reply.code(400).send({ success: false, error: 'Token etibarsız və ya vaxtı bitib.' })
        }

        const newHash = await bcrypt.hash(body.data.newPassword, BCRYPT_ROUNDS)
        await fastify.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
                failedAttempts: 0,
                lockedUntil: null,
            },
        })

        return reply.send({ success: true })
    })
}

export default authRoutes

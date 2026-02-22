import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const BCRYPT_ROUNDS = 12
const TEMP_PASSWORD = 'IcarePro2024!'    // временный пароль при создании

const createSchema = z.object({
    email: z.email(),
    name: z.string().min(1),
    role: z.enum(['OWNER', 'STAFF', 'TENANT']),
})

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['OWNER', 'STAFF', 'TENANT']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(),
    telegramChatId: z.string().optional(),
})

const usersRoutes: FastifyPluginAsync = async (fastify) => {
    const ownerOnly = [authenticate, requireRole(['OWNER'])]

    // GET /users
    fastify.get('/', { preHandler: ownerOnly }, async (_req, reply) => {
        const users = await fastify.prisma.user.findMany({
            where: withOrg(_req),
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true },
            orderBy: { createdAt: 'asc' },
        })
        return reply.send({ success: true, data: users, meta: { total: users.length } })
    })

    // GET /users/:id
    fastify.get('/:id', { preHandler: ownerOnly }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const user = await fastify.prisma.user.findFirst({
            where: { id, ...withOrg(req) },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })
        return reply.send({ success: true, data: user })
    })

    // POST /users — создаёт Staff аккаунт с временным паролем
    fastify.post('/', { preHandler: ownerOnly }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const passwordHash = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS)
        try {
            const user = await fastify.prisma.user.create({
                data: { ...body.data, ...withOrg(req), passwordHash },
                select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true },
            })
            return reply.code(201).send({
                success: true,
                data: user,
                meta: { tempPassword: TEMP_PASSWORD, note: 'User must change password on first login' },
            })
        } catch {
            return reply.code(409).send({ success: false, error: 'Email already in use', details: { field: 'email' } })
        }
    })

    // PATCH /users/:id
    fastify.patch('/:id', { preHandler: ownerOnly }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const exists = await fastify.prisma.user.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'User not found' })

        const { password, ...rest } = body.data
        const user = await fastify.prisma.user.update({
            where: { id },
            data: {
                ...rest,
                ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
            },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true },
        })
        return reply.send({ success: true, data: user })
    })

    // DELETE /users/:id — soft delete, запрет самоудаления
    fastify.delete('/:id', { preHandler: ownerOnly }, async (req, reply) => {
        const { id } = req.params as { id: string }
        if (id === req.user.sub) {
            return reply.code(400).send({ success: false, error: 'Cannot deactivate your own account' })
        }
        const exists = await fastify.prisma.user.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'User not found' })
        await fastify.prisma.user.update({ where: { id }, data: { isActive: false } })
        return reply.code(204).send()
    })
}

export default usersRoutes

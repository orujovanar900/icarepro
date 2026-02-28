import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const BCRYPT_ROUNDS = 12
const TEMP_PASSWORD = 'IcarePro2024!'    // временный пароль при создании

const schema = {
    body: z.object({
        email: z.string().email(),
        name: z.string().min(2),
        role: z.enum(['OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR', 'TENANT']).optional(),
        phone: z.string().optional()
    }),
}

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR', 'TENANT']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(),
    telegramChatId: z.string().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
})

const profileSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
})

const usersRoutes: FastifyPluginAsync = async (fastify) => {
    const ownerOnly = [authenticate, requireRole(['OWNER', 'MANAGER'])]

    const supabase = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_SERVICE_KEY'] ?? '',
    )

    // GET /users
    fastify.get('/', { preHandler: ownerOnly }, async (_req, reply) => {
        const q = _req.query as Record<string, string>
        const limit = Number(q['limit'] ?? 50)
        const offset = Number(q['offset'] ?? 0)

        const [users, total] = await Promise.all([
            fastify.prisma.user.findMany({
                where: withOrg(_req),
                select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
                orderBy: { createdAt: 'asc' },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.user.count({ where: withOrg(_req) })
        ])
        return reply.send({ success: true, data: users, meta: { total } })
    })

    // PUT /users/profile — update my own profile
    fastify.put('/profile', { preHandler: [authenticate] }, async (req, reply) => {
        const body = profileSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const user = await fastify.prisma.user.update({
            where: { id: req.user.sub, ...withOrg(req) },
            data: {
                ...(body.data.name ? { name: body.data.name } : {}),
                ...(typeof body.data.phone !== 'undefined' ? { phone: body.data.phone } : {}),
                ...(typeof body.data.avatarUrl !== 'undefined' ? { avatarUrl: body.data.avatarUrl || null } : {}),
            },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
        })
        return reply.send({ success: true, data: user })
    })

    // POST /users/profile/avatar — upload avatar
    fastify.post('/profile/avatar', { preHandler: [authenticate] }, async (req, reply) => {
        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const fileBuffer = await data.toBuffer()
        const ext = data.filename.split('.').pop() ?? 'jpg'
        const path = `avatars/${req.user.sub}-${Date.now()}.${ext}`

        const { error } = await supabase.storage
            .from('tenant-documents')
            .upload(path, fileBuffer, { contentType: data.mimetype, upsert: true })

        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('tenant-documents').getPublicUrl(path)

        const user = await fastify.prisma.user.update({
            where: { id: req.user.sub },
            data: { avatarUrl: publicUrl },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
        })

        return reply.send({ success: true, data: user })
    })

    // GET /users/:id
    fastify.get('/:id', { preHandler: ownerOnly }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const user = await fastify.prisma.user.findFirst({
            where: { id, ...withOrg(req) },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
        })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })
        return reply.send({ success: true, data: user })
    })

    // POST /users — создаёт Staff аккаунт с временным паролем
    fastify.post('/', { preHandler: ownerOnly }, async (req, reply) => {
        const body = schema.body.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const passwordHash = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS)
        try {
            const { email, name, role, phone } = body.data
            // Cast phone to string | undefined
            const userPhone = typeof phone === 'string' ? phone : undefined;
            const user = await fastify.prisma.user.create({
                data: {
                    email,
                    name,
                    role: role || 'MANAGER',
                    phone: userPhone,
                    passwordHash,
                    ...withOrg(req),
                },
                select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
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
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, telegramChatId: true, phone: true, avatarUrl: true },
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

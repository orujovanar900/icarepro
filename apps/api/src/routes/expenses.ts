import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const createSchema = z.object({
    amount: z.number().positive(),
    date: z.string().date(),
    category: z.string().min(1),
    description: z.string().optional(),
})

const updateSchema = createSchema.partial()

const expensesRoutes: FastifyPluginAsync = async (fastify) => {
    const financeRoles = [authenticate, requireRole(['OWNER', 'MANAGER', 'CASHIER'])]

    // GET /expenses
    fastify.get('/', { preHandler: financeRoles }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const where = {
            ...withOrg(req),
            ...(q['category'] ? { category: q['category'] } : {}),
            ...(q['dateFrom'] || q['dateTo'] ? {
                date: {
                    ...(q['dateFrom'] ? { gte: new Date(q['dateFrom']) } : {}),
                    ...(q['dateTo'] ? { lte: new Date(q['dateTo']) } : {}),
                },
            } : {}),
        }
        const [expenses, total, totalAgg] = await Promise.all([
            fastify.prisma.expense.findMany({
                where,
                include: { createdByUser: { select: { name: true } } },
                orderBy: { date: 'desc' },
                take: Number(q['limit'] ?? 50),
                skip: Number(q['offset'] ?? 0),
            }),
            fastify.prisma.expense.count({ where }),
            fastify.prisma.expense.aggregate({ _sum: { amount: true }, where }),
        ])
        return reply.send({
            success: true, data: expenses,
            meta: { total, totalAmount: Number(totalAgg._sum.amount ?? 0) },
        })
    })

    // GET /expenses/:id
    fastify.get('/:id', { preHandler: financeRoles }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const expense = await fastify.prisma.expense.findFirst({ where: { id, ...withOrg(req) } })
        if (!expense) return reply.code(404).send({ success: false, error: 'Expense not found' })
        return reply.send({ success: true, data: expense })
    })

    // POST /expenses
    fastify.post('/', { preHandler: financeRoles }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const expense = await fastify.prisma.expense.create({
            data: { ...body.data, organizationId: req.user.organizationId, date: new Date(body.data.date), createdBy: req.user.sub },
        })
        return reply.code(201).send({ success: true, data: expense })
    })

    // PATCH /expenses/:id
    fastify.patch('/:id', { preHandler: financeRoles }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const exists = await fastify.prisma.expense.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Expense not found' })
        const { date, ...rest } = body.data
        const expense = await fastify.prisma.expense.update({
            where: { id },
            data: { ...rest, ...(date ? { date: new Date(date) } : {}) } as never,
        })
        return reply.send({ success: true, data: expense })
    })

    // DELETE /expenses/:id
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.expense.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Expense not found' })
        await fastify.prisma.expense.delete({ where: { id } })
        return reply.code(204).send()
    })
}

export default expensesRoutes

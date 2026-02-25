import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const createSchema = z.object({
    propertyId: z.string().min(1),
    meterType: z.enum(['ELECTRICITY', 'WATER_COLD', 'WATER_HOT', 'GAS', 'HEAT']),
    readingDate: z.string().date(),
    value: z.number().positive(),
    periodMonth: z.number().int().min(1).max(12),
    periodYear: z.number().int().min(2020),
    note: z.string().optional(),
})

const meterReadingsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /meter-readings
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const readings = await fastify.prisma.meterReading.findMany({
            where: {
                ...withOrg(req),
                ...(q['propertyId'] ? { propertyId: q['propertyId'] } : {}),
                ...(q['meterType'] ? { meterType: q['meterType'] as never } : {}),
                ...(q['month'] ? { periodMonth: Number(q['month']) } : {}),
                ...(q['year'] ? { periodYear: Number(q['year']) } : {}),
            },
            include: { property: { select: { name: true, number: true } } },
            orderBy: { readingDate: 'desc' },
            take: Number(q['limit'] ?? 50),
            skip: Number(q['offset'] ?? 0),
        })
        return reply.send({ success: true, data: readings })
    })

    // POST /meter-readings — авто-вычисляет consumption
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        // Находим предыдущее показание для этого счётчика
        const previous = await fastify.prisma.meterReading.findFirst({
            where: {
                ...withOrg(req),
                propertyId: body.data.propertyId,
                meterType: body.data.meterType,
            },
            orderBy: { readingDate: 'desc' },
        })

        const consumption = previous
            ? Math.max(0, body.data.value - Number(previous.value))
            : null

        const reading = await fastify.prisma.meterReading.create({
            data: {
                ...body.data,
                ...withOrg(req),
                readingDate: new Date(body.data.readingDate),
                consumption: consumption ?? undefined,
            },
        })

        return reply.code(201).send({ success: true, data: reading })
    })
}

export default meterReadingsRoutes

import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { withOrg } from '../utils/withOrg.js'

const auditLogRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /audit-log — только OWNER
    fastify.get('/', { preHandler: [authenticate, requireRole(['OWNER'])] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const where = {
            ...withOrg(req),
            ...(q['userId'] ? { userId: q['userId'] } : {}),
            ...(q['entityType'] ? { entityType: q['entityType'] } : {}),
            ...(q['dateFrom'] || q['dateTo'] ? {
                createdAt: {
                    ...(q['dateFrom'] ? { gte: new Date(q['dateFrom']) } : {}),
                    ...(q['dateTo'] ? { lte: new Date(q['dateTo']) } : {}),
                },
            } : {}),
        }

        const limit = Number(q['limit'] ?? 50)
        const offset = Number(q['offset'] ?? 0)

        const [logs, total] = await Promise.all([
            fastify.prisma.auditLog.findMany({
                where,
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.auditLog.count({ where }),
        ])

        return reply.send({ success: true, data: logs, meta: { total, limit, offset } })
    })
}

export default auditLogRoutes

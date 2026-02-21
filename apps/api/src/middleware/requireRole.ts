import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UserRole } from '@prisma/client'

/**
 * requireRole(['OWNER', 'STAFF']) — возвращает preHandler hook.
 * 403 если роль пользователя не входит в список.
 */
export function requireRole(roles: UserRole[]) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.user) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }
        if (!roles.includes(req.user.role as UserRole)) {
            return reply.code(403).send({ success: false, error: 'Forbidden' })
        }
    }
}

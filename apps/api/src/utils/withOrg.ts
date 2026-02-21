import type { FastifyRequest } from 'fastify'

/**
 * Возвращает { organizationId } из req.user для фильтрации Prisma запросов.
 * Использование: prisma.contract.findMany({ where: { ...withOrg(req), status: 'ACTIVE' } })
 */
export function withOrg(req: FastifyRequest) {
    return { organizationId: req.user.organizationId }
}

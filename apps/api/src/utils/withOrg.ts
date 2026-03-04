import type { FastifyRequest } from 'fastify'

/**
 * Возвращает { organizationId } из req.user для фильтрации Prisma запросов.
 * Использование: prisma.contract.findMany({ where: { ...withOrg(req), status: 'ACTIVE' } })
 */
export function withOrg(req: FastifyRequest) {
    if (req.user?.role === 'SUPERADMIN') {
        return {} // SUPERADMIN sees all records across all organizations
    }
    return { organizationId: req.user.organizationId }
}

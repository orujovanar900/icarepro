import type { FastifyRequest } from 'fastify'
import { PLATFORM_ROLES } from '../middleware/requireRole.js'

/**
 * Возвращает { organizationId } из req.user для фильтрации Prisma запросов.
 * Platform staff (SUPERADMIN, MODERATOR, SUPPORT, FINANCE, CONTENT) see all records.
 * Использование: prisma.contract.findMany({ where: { ...withOrg(req), status: 'ACTIVE' } })
 */
export function withOrg(req: FastifyRequest) {
    if (PLATFORM_ROLES.includes(req.user?.role as any)) {
        return {} // Platform staff see all records across all organizations
    }
    // Org users always have a non-null organizationId (platform staff handled above)
    return { organizationId: req.user.organizationId as string }
}

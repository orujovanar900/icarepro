import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * All valid application roles — mirrors the UserRole enum in schema.prisma.
 * Exported so route files can use it without importing from @prisma/client directly.
 */
export type AppRole =
    | 'SUPERADMIN'
    | 'OWNER'
    | 'MANAGER'
    | 'CASHIER'
    | 'ACCOUNTANT'
    | 'ADMINISTRATOR'
    | 'TENANT'
    | 'AGENT'
    | 'AGENTLIK'
    | 'ICARECI'

/**
 * requireRole(['OWNER', 'MANAGER']) — returns a Fastify preHandler hook.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 * SUPERADMIN always bypasses all role checks.
 */
export function requireRole(roles: AppRole[]) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.user) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }
        if (req.user.role === 'SUPERADMIN') {
            return // SUPERADMIN has access to everything
        }
        if (!roles.includes(req.user.role as AppRole)) {
            return reply.code(403).send({ success: false, error: 'Forbidden' })
        }
    }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { JwtPayload } from '../types.js'

/**
 * preHandler: проверяет Bearer token, заполняет req.user с organizationId.
 * Также проверяет isActive пользователя в БД.
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify()

        const payload = req.user as unknown as JwtPayload

        // Проверяем что пользователь ещё активен в БД
        const user = await req.server.prisma.user.findFirst({
            where: {
                id: payload.sub,
                organizationId: payload.organizationId,
                isActive: true,
            },
            select: { id: true, email: true, role: true, organizationId: true, name: true, jwtVersion: true, avatarUrl: true },
        })

        // Only invalidate if the DB has a jwtVersion AND it doesn't match the token.
        // If jwtVersion is null (not yet set), allow any token through (backward compat).
        if (!user) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }
        if (user.jwtVersion !== null && user.jwtVersion !== (payload.jwtVersion ?? null)) {
            return reply.code(401).send({ success: false, error: 'Session expired. Please log in again.' })
        }

        // Нормализуем req.user
        req.user = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            name: user.name,
            jwtVersion: user.jwtVersion,
            avatarUrl: user.avatarUrl,
        }
    } catch {
        return reply.code(401).send({ success: false, error: 'Unauthorized' })
    }
}

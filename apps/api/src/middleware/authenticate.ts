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
            select: {
                id: true, email: true, role: true, organizationId: true, name: true, jwtVersion: true, avatarUrl: true,
                organization: { select: { subscriptionStatus: true } }
            },
        })

        if (!user) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }
        // Strict version check: treat tokens without a jwtVersion field as version 0.
        // Eliminates the null escape hatch that allowed pre-versioning tokens to bypass revocation.
        if (user.jwtVersion !== (payload.jwtVersion ?? 0)) {
            return reply.code(401).send({ success: false, error: 'Session expired. Please log in again.' })
        }

        if (user.organization?.subscriptionStatus === 'SUSPENDED' && user.role !== 'SUPERADMIN') {
            const rawPath = req.url.split('?')[0] || '';
            // Exclude /auth and /billing related routes so users can log out / pay while suspended
            if (!rawPath.includes('/auth/') && !rawPath.includes('/billing/')) {
                return reply.code(403).send({
                    success: false,
                    error: "Abunəlik dayandırılıb",
                    code: "SUBSCRIPTION_SUSPENDED"
                });
            }
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

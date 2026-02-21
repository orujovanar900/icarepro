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
            select: { id: true, email: true, role: true, organizationId: true, name: true },
        })

        if (!user) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }

        // Нормализуем req.user
        req.user = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            name: user.name,
        }
    } catch {
        return reply.code(401).send({ success: false, error: 'Unauthorized' })
    }
}

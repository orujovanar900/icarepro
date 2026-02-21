import type { UserRole } from '@prisma/client'
import '@fastify/jwt'

export interface JwtPayload {
    sub: string          // userId
    email: string
    role: UserRole
    organizationId: string
    name: string
}

// Расширяем @fastify/jwt чтобы req.user был типизирован как JwtPayload
declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: JwtPayload
    }
}

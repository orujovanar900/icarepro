import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient
    }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
    await prisma.$connect()
    fastify.decorate('prisma', prisma)
    // Remove onClose disconnect hook so the global singleton survives fastify hot reloads
})

export default prismaPlugin

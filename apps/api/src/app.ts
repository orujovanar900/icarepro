import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import prismaPlugin from './plugins/prisma.js'
import authRoutes from './routes/auth.js'
import contractsRoutes from './routes/contracts.js'
import dashboardRoutes from './routes/dashboard.js'
import paymentsRoutes from './routes/payments.js'
import propertiesRoutes from './routes/properties.js'
import tenantsRoutes from './routes/tenants.js'
import expensesRoutes from './routes/expenses.js'
import usersRoutes from './routes/users.js'
import auditLogRoutes from './routes/audit-log.js'
import meterReadingsRoutes from './routes/meter-readings.js'
import documentsRoutes from './routes/documents.js'

import './types.js'
import './cron/alerts.js'

export async function buildApp() {
    const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } })

    // ── Security ───────────────────────────────────────────
    await app.register(helmet, { global: true })

    await app.register(cors, {
        origin: [
            'http://localhost:5173',
            'https://icarepro.pages.dev',
            /https:\/\/.*\.icarepro\.pages\.dev/,
            process.env['FRONTEND_URL'] ?? 'https://icare-pro-afd3bf.netlify.app'
        ],
        credentials: true,
    })

    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
            success: false,
            error: 'Too many requests, please try again later.',
        }),
    })

    await app.register(cookie, {
        secret: process.env['COOKIE_SECRET'] ?? process.env['JWT_SECRET'] ?? 'cookie-secret',
    })

    await app.register(jwt, {
        secret: process.env['JWT_SECRET'] ?? 'jwt-secret-change-me',
        sign: { expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d' },
        cookie: { cookieName: 'token', signed: false },
    })

    await app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    })

    // ── Database ───────────────────────────────────────────
    await app.register(prismaPlugin)

    // ── Global error handler ───────────────────────────────
    app.setErrorHandler((error, _req, reply) => {
        app.log.error(error)
        const err = error as { statusCode?: number; message?: string }
        const status = err.statusCode ?? 500
        return reply.code(status).send({
            success: false,
            error: status === 500 ? 'Internal server error' : err.message,
        })
    })

    // ── Health ─────────────────────────────────────────────
    app.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '0.1.0',
    }))

    // ── Routes ─────────────────────────────────────────────
    await app.register(authRoutes, { prefix: '/auth' })
    await app.register(contractsRoutes, { prefix: '/contracts' })
    await app.register(dashboardRoutes, { prefix: '/dashboard' })
    await app.register(paymentsRoutes, { prefix: '/payments' })
    await app.register(propertiesRoutes, { prefix: '/properties' })
    await app.register(tenantsRoutes, { prefix: '/tenants' })
    await app.register(expensesRoutes, { prefix: '/expenses' })
    await app.register(usersRoutes, { prefix: '/users' })
    await app.register(auditLogRoutes, { prefix: '/audit-log' })
    await app.register(meterReadingsRoutes, { prefix: '/meter-readings' })
    await app.register(documentsRoutes, { prefix: '/documents' })

    return app
}

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
import { logger } from './logger.js'
import tenantsRoutes from './routes/tenants.js'
import expensesRoutes from './routes/expenses.js'
import usersRoutes from './routes/users.js'
import auditLogRoutes from './routes/audit-log.js'
import meterReadingsRoutes from './routes/meter-readings.js'
import hesabatRoutes from './routes/hesabat.js'
import adminRoutes from './routes/admin.js'
import listingsRoutes from './routes/listings.js'
import queueRoutes from './routes/queue.js'
import notificationsRoutes from './routes/notifications.js'
import tickerRoutes from './routes/ticker.js'
import aiRoutes from './routes/ai.js'
import promotionsRoutes from './routes/promotions.js'

import cron from 'node-cron'
import { generateUnpaidRecords, markOverduePayments, checkRenewalWarnings, processAutoRenewals, resetDailyTickerCounts } from './cron/billingCron.js'

import './types.js'
import './cron/alerts.js'
import './cron/subscriptions.js'

export async function buildApp() {
    const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } })

    // ── Logging ────────────────────────────────────────────
    app.addHook('onRequest', (request, reply, done) => {
        logger.info(`${request.method} ${request.url}`, {
            ip: request.ip,
            userAgent: request.headers['user-agent']
        })
        done()
    })

    // ── Security ───────────────────────────────────────────
    await app.register(helmet, { global: true })

    await app.register(cors, {
        origin: [
            'https://icarepro.pages.dev',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
        ],
        credentials: true,
    })

    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
            success: false,
            error: 'Çox sayda sorğu. Bir dəqiqə gözləyin.',
        }),
    })

    if (!process.env['JWT_SECRET']) {
        console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.')
        process.exit(1)
    }
    if (!process.env['COOKIE_SECRET'] && !process.env['JWT_SECRET']) {
        console.error('FATAL: COOKIE_SECRET environment variable is not set. Exiting.')
        process.exit(1)
    }

    await app.register(cookie, {
        secret: process.env['COOKIE_SECRET'] ?? process.env['JWT_SECRET'],
    })

    await app.register(jwt, {
        secret: process.env['JWT_SECRET'],
        sign: { expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d' },
        cookie: { cookieName: 'token', signed: false },
    })

    await app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    })

    // ── Database ───────────────────────────────────────────
    await app.register(prismaPlugin)

    // ── Global error handler ───────────────────────────────
    app.setErrorHandler((error, request, reply) => {
        const logErr = error as any;
        logger.error(`Error: ${logErr.message}`, {
            path: request.url,
            method: request.method,
            stack: logErr.stack
        })
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
    await app.register(hesabatRoutes, { prefix: '/hesabat' })
    await app.register(adminRoutes, { prefix: '/admin' })
    await app.register(listingsRoutes, { prefix: '/listings' })
    await app.register(queueRoutes, { prefix: '/queue' })
    await app.register(notificationsRoutes, { prefix: '/notifications' })
    await app.register(tickerRoutes, { prefix: '/ticker' })
    await app.register(aiRoutes, { prefix: '/ai' })
    await app.register(promotionsRoutes, { prefix: '/promotions' })

    // Billing cron — runs daily at midnight
    cron.schedule('0 0 * * *', async () => {
        app.log.info('[BillingCron] Starting daily billing run')
        try {
            await generateUnpaidRecords(app.prisma)
            await markOverduePayments(app.prisma)
            await checkRenewalWarnings(app.prisma)
            await processAutoRenewals(app.prisma)
            await resetDailyTickerCounts(app.prisma)
            app.log.info('[BillingCron] Daily billing run completed')
        } catch (err) {
            app.log.error({ err }, '[BillingCron] Daily billing run failed')
        }
    })

    return app
}

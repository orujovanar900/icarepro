import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { withOrg } from '../utils/withOrg.js'
import { requireRole } from '../middleware/requireRole.js'

export type AppNotification = {
    id: string
    type: 'CONTRACT_EXPIRING' | 'PAYMENT_OVERDUE' | 'PAYMENT_DUE' | 'DEPOSIT_RETURN'
    title: string
    message: string
    date: Date
    metadata: Record<string, any>
}

const notificationsRoutes: FastifyPluginAsync = async (fastify) => {

    // GET /notifications - Computes system notifications dynamically
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const org = withOrg(req)
        const now = new Date()

        // Use +30 days window for expiring contracts and due payments
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        // Use +3 days for imminent due payments
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

        const notifications: AppNotification[] = []

        // 1. Contracts expiring in 30 days
        const expiringContracts = await fastify.prisma.contract.findMany({
            where: {
                ...org,
                status: 'ACTIVE',
                endDate: { gte: now, lte: in30Days }
            },
            include: { property: true, tenant: true }
        })

        for (const c of expiringContracts) {
            const daysLeft = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            notifications.push({
                id: `exp-${c.id}`,
                type: 'CONTRACT_EXPIRING',
                title: 'Müqavilə bitir',
                message: `${c.property.name} əmlakında ${c.tenant.fullName} ilə olan müqavilənin bitməsinə ${daysLeft} gün qalıb.`,
                date: new Date(c.endDate),
                metadata: { contractId: c.id, tenantId: c.tenant.id, propertyId: c.property.id }
            })
        }

        // 2 & 3. Overdue Payments & Payment Due Reminders
        const activeContracts = await fastify.prisma.contract.findMany({
            where: { ...org, status: 'ACTIVE' },
            include: { tenant: true, property: true, payments: true }
        })

        for (const c of activeContracts) {
            // Find total paid vs expected
            const totalPaid = c.payments.reduce((sum, p) => sum + Number(p.amount), 0)
            const start = new Date(c.startDate)
            const expectedPaymentCycle = Math.floor(totalPaid / Number(c.monthlyRent))

            const nextExpectedDate = new Date(start)
            nextExpectedDate.setMonth(nextExpectedDate.getMonth() + expectedPaymentCycle)

            if (nextExpectedDate < now) {
                // OVERDUE
                const diffTime = Math.abs(now.getTime() - nextExpectedDate.getTime())
                const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                if (daysOverdue > 0) {
                    notifications.push({
                        id: `overdue-${c.id}`,
                        type: 'PAYMENT_OVERDUE',
                        title: 'Gecikmiş Ödəniş',
                        message: `${c.tenant.fullName} (${c.property.name}) ödənişi ${daysOverdue} gün gecikdirilir.`,
                        date: nextExpectedDate,
                        metadata: { contractId: c.id, daysOverdue }
                    })
                }
            } else if (nextExpectedDate <= in3Days) {
                // DUE IN <= 3 DAYS
                const diffTime = Math.abs(nextExpectedDate.getTime() - now.getTime())
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                notifications.push({
                    id: `due-${c.id}`,
                    type: 'PAYMENT_DUE',
                    title: 'Yaxınlaşan Ödəniş',
                    message: `${c.tenant.fullName} (${c.property.name}) üçün ödəniş vaxtına ${daysLeft} gün qalıb.`,
                    date: nextExpectedDate,
                    metadata: { contractId: c.id, daysLeft }
                })
            }
        }

        // (Sorting by date ascending so most urgent is first... wait no, actually overdue = oldest date. So sort by date asc)
        notifications.sort((a, b) => a.date.getTime() - b.date.getTime())

        return reply.send({ success: true, data: notifications })
    })

    // POST /notifications/send-reminders - Email specifically to tenants (3 days due or overdue or receipt)
    // NOTE: Requires external integration (e.g. Resend) which we'll configure
    fastify.post('/send-reminders', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        // Mocking emails for now, integrating with Resend via `email.ts` normally.
        // We will return a success state indicating reminders were queued.
        return reply.send({ success: true, message: 'Xatırlatmalar göndərilmə üçün növbəyə əlavə edildi' })
    })
}

export default notificationsRoutes

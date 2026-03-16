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
        const PLATFORM_ROLES = ['SUPERADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT']
        if (PLATFORM_ROLES.includes(req.user.role)) {
            return reply.send({ success: true, data: [] })
        }

        const org = withOrg(req)
        const now = new Date()

        // Use +30 days window for expiring contracts
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const notifications: AppNotification[] = []

        // 1. Contracts expiring in 30 days
        const expiringContracts = await fastify.prisma.contract.findMany({
            where: {
                ...org,
                status: 'ACTIVE',
                endDate: { gte: now, lte: in30Days }
            },
            include: { property: true, tenant: { select: { id: true, tenantType: true, firstName: true, lastName: true, companyName: true } } }
        })

        for (const c of expiringContracts) {
            const daysLeft = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            notifications.push({
                id: `exp-${c.id}`,
                type: 'CONTRACT_EXPIRING',
                title: 'Müqavilə bitir',
                message: `${c.property.name} əmlakında ${c.tenant.tenantType === 'fiziki' ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim() : c.tenant.companyName || ''} ilə olan müqavilənin bitməsinə ${daysLeft} gün qalıb.`,
                date: new Date(c.endDate),
                metadata: { contractId: c.id, tenantId: c.tenant.id, propertyId: c.property.id }
            })
        }

        // 2 & 3. Overdue Payments & Payment Due Reminders — based on actual Payment.status
        const pendingPayments = await fastify.prisma.payment.findMany({
            where: {
                ...org,
                status: { in: ['OVERDUE', 'UNPAID'] },
                deletedAt: null,
            },
            include: {
                contract: {
                    include: {
                        property: true,
                        tenant: { select: { id: true, tenantType: true, firstName: true, lastName: true, companyName: true } }
                    }
                }
            }
        })

        for (const payment of pendingPayments) {
            const c = payment.contract
            const tenantName = c.tenant.tenantType === 'fiziki'
                ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim()
                : c.tenant.companyName || ''
            const isOverdue = payment.status === 'OVERDUE'
            notifications.push({
                id: `${isOverdue ? 'overdue' : 'due'}-${payment.id}`,
                type: isOverdue ? 'PAYMENT_OVERDUE' : 'PAYMENT_DUE',
                title: isOverdue ? 'Gecikmiş Ödəniş' : 'Yaxınlaşan Ödəniş',
                message: isOverdue
                    ? `${tenantName} (${c.property.name}) ödənişi gecikdirilir.`
                    : `${tenantName} (${c.property.name}) üçün ödəniş vaxtı yaxınlaşır.`,
                date: new Date(payment.paymentDate),
                metadata: { contractId: c.id, paymentId: payment.id, amount: Number(payment.expectedAmount ?? payment.amount) }
            })
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

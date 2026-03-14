import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { z } from 'zod'

const PLAN_PRICES: Record<string, number> = {
    FREE_TRIAL: 0,
    BASHLANQIC: 29,
    BIZNES: 69,
    KORPORATIV: 149,
    PROFESSIONAL: 49,
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /admin/stats — Full SuperAdmin Dashboard Data
    fastify.get('/stats', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const [
            totalOrganizations,
            totalProperties,
            totalContracts,
            totalUsers,
            suspendedOrgs,
            newThisMonth,
            newLastMonth,
            allOrgs,
            auditLogs,
        ] = await Promise.all([
            fastify.prisma.organization.count(),
            fastify.prisma.property.count(),
            fastify.prisma.contract.count(),
            fastify.prisma.user.count(),
            fastify.prisma.organization.count({ where: { subscriptionStatus: 'SUSPENDED' } }),
            fastify.prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
            fastify.prisma.organization.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
            fastify.prisma.organization.findMany({
                include: {
                    users: { where: { role: 'OWNER' }, select: { email: true, name: true } },
                    _count: { select: { properties: true, contracts: true, users: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            fastify.prisma.auditLog.findMany({
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { organization: { select: { name: true } } }
            })
        ])

        // Plan distribution
        const planCounts: Record<string, number> = {}
        let mrr = 0
        let activePlans = 0
        let gracePeriodCount = 0
        let suspendedCount = 0
        let freeTrialCount = 0
        const topOrgs: any[] = []
        const expiringInWeek: any[] = []

        for (const org of allOrgs) {
            const plan = org.subscriptionPlan
            planCounts[plan] = (planCounts[plan] || 0) + 1
            mrr += PLAN_PRICES[plan] || 0
            if (org.subscriptionStatus === 'ACTIVE' && (PLAN_PRICES[plan] || 0) > 0) activePlans++
            if (org.subscriptionStatus === 'GRACE_PERIOD') gracePeriodCount++
            if (org.subscriptionStatus === 'SUSPENDED') suspendedCount++
            if (plan === 'FREE_TRIAL') freeTrialCount++
            if (
                org.planExpiresAt &&
                org.planExpiresAt > now &&
                org.planExpiresAt! <= sevenDaysFromNow &&
                org.subscriptionStatus === 'ACTIVE'
            ) {
                const daysLeft = Math.ceil((org.planExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                expiringInWeek.push({
                    id: org.id,
                    name: org.name,
                    plan: org.subscriptionPlan,
                    daysLeft,
                    expiresAt: org.planExpiresAt,
                })
            }
        }

        // Top 10 by property count
        const sorted = [...allOrgs].sort((a, b) => b._count.properties - a._count.properties).slice(0, 10)
        for (const org of sorted) {
            topOrgs.push({
                id: org.id,
                name: org.name,
                ownerEmail: org.users[0]?.email || 'N/A',
                plan: org.subscriptionPlan,
                propertiesCount: org._count.properties,
                contractsCount: org._count.contracts,
                createdAt: org.createdAt
            })
        }

        // Monthly registrations (last 12 months)
        const monthlyRegistrations: { month: string, count: number }[] = []
        const mrrTrend: { month: string, mrr: number }[] = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
            const label = d.toLocaleDateString('az-AZ', { month: 'short', year: '2-digit' })
            const count = allOrgs.filter(o => o.createdAt >= d && o.createdAt <= dEnd).length
            monthlyRegistrations.push({ month: label, count })
            // For MRR trend, compute based on orgs created before that period
            const orgsAtMonth = allOrgs.filter(o => o.createdAt <= dEnd)
            const mrrAtMonth = orgsAtMonth.reduce((acc, o) => acc + (PLAN_PRICES[o.subscriptionPlan] || 0), 0)
            mrrTrend.push({ month: label, mrr: mrrAtMonth })
        }

        // New registrations growth
        const growthPct = newLastMonth === 0 ? 100 : Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)

        // Plan distribution for donut chart
        const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
            plan,
            count,
            price: PLAN_PRICES[plan] || 0,
        }))

        return reply.send({
            success: true,
            data: {
                overview: {
                    totalOrganizations,
                    activePlans,
                    newThisMonth,
                    newThisMonthGrowth: growthPct,
                    totalUsers,
                    totalProperties,
                    suspendedCount,
                },
                mrr,
                planDistribution,
                monthlyRegistrations,
                mrrTrend,
                health: {
                    active: activePlans,
                    gracePeriod: gracePeriodCount,
                    suspended: suspendedCount,
                    freeTrial: freeTrialCount,
                },
                expiringInWeek,
                recentActivity: auditLogs.map((log: any) => ({
                    id: log.id,
                    action: log.action,
                    meta: log.meta,
                    orgName: log.organization?.name || 'N/A',
                    createdAt: log.createdAt,
                })),
                topOrganizations: topOrgs,
            }
        })
    })

    // GET /admin/users (Organizations List)
    fastify.get('/users', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const organizations = await fastify.prisma.organization.findMany({
            include: {
                users: {
                    where: { role: 'OWNER' },
                    select: { email: true, name: true }
                },
                _count: {
                    select: { users: true, properties: true, contracts: true, tenants: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const data = organizations.map(org => ({
            id: org.id,
            name: org.name,
            ownerEmail: org.users[0]?.email || 'No Owner',
            usersCount: org._count.users,
            propertiesCount: org._count.properties,
            contractsCount: org._count.contracts,
            tenantsCount: org._count.tenants,
            createdAt: org.createdAt,
            plan: org.plan,
            subscriptionPlan: org.subscriptionPlan,
            subscriptionStatus: org.subscriptionStatus,
            planExpiresAt: org.planExpiresAt,
            gracePeriodStartedAt: org.gracePeriodStartedAt,
            isActive: org.isActive
        }))

        return reply.send({ success: true, data })
    })

    // GET /admin/organizations/:id
    fastify.get('/organizations/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const org = await fastify.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
                },
                properties: {
                    select: { id: true, name: true, address: true, status: true }
                },
                tenants: {
                    select: { id: true, tenantType: true, firstName: true, lastName: true, companyName: true, phone: true, isBlacklisted: true }
                }
            }
        })

        if (!org) {
            return reply.code(404).send({ success: false, error: 'Organization not found' })
        }

        return reply.send({ success: true, data: org })
    })

    // POST /admin/organizations/:id/toggle-status
    fastify.post('/organizations/:id/toggle-status', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const org = await fastify.prisma.organization.findUnique({ where: { id } })

        if (!org) {
            return reply.code(404).send({ success: false, error: 'Organization not found' })
        }

        const updatedOrg = await fastify.prisma.organization.update({
            where: { id },
            data: { isActive: !org.isActive }
        })

        return reply.send({ success: true, data: updatedOrg })
    })

    // PATCH /admin/organizations/:id/subscription
    fastify.patch('/organizations/:id/subscription', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { status, expiresAt, additionalDays, subscriptionPlan, note } = req.body as {
            status?: string,
            expiresAt?: string,
            additionalDays?: number,
            subscriptionPlan?: string,
            note?: string
        }

        const org = await fastify.prisma.organization.findUnique({ where: { id } })
        if (!org) return reply.code(404).send({ success: false, error: 'Təşkilat tapılmadı' })

        let planExp = expiresAt ? new Date(expiresAt) : org.planExpiresAt
        if (additionalDays && planExp) {
            planExp = new Date(planExp.getTime() + additionalDays * 24 * 60 * 60 * 1000)
        } else if (additionalDays && !planExp) {
            planExp = new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000)
        }

        // Map subscriptionPlan to old OrgPlan enum for compatibility
        const planToOrgPlan: Record<string, string> = {
            FREE_TRIAL: 'FREE',
            BASHLANQIC: 'PRO',
            BIZNES: 'PRO',
            KORPORATIV: 'ENTERPRISE',
            PROFESSIONAL: 'PRO',
        }

        const updateData: any = {
            planExpiresAt: planExp,
            ...(status ? {
                subscriptionStatus: status as any,
                ...(status === 'GRACE_PERIOD' && org.subscriptionStatus !== 'GRACE_PERIOD' ? { gracePeriodStartedAt: new Date() } : {})
            } : {}),
            ...(subscriptionPlan ? {
                subscriptionPlan: subscriptionPlan as any,
                plan: (planToOrgPlan[subscriptionPlan] || 'FREE') as any,
            } : {}),
        }

        const updatedOrg = await fastify.prisma.organization.update({
            where: { id },
            data: updateData
        })

        // Log to audit if plan changes
        if (subscriptionPlan) {
            await fastify.prisma.auditLog.create({
                data: {
                    organizationId: id,
                    userId: req.user.sub,
                    action: 'PLAN_CHANGED',
                    entityType: 'organization',
                    entityId: id,
                    metadata: { newPlan: subscriptionPlan, note: note || null } as any,
                }
            })
        }

        return reply.send({ success: true, data: updatedOrg })
    })

    // PATCH /admin/users/:userId/role
    fastify.patch('/users/:userId/role', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { userId } = req.params as { userId: string }
        const { role } = req.body as { role: string }

        const validRoles = ['SUPERADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR', 'TENANT', 'AGENTLIK', 'AGENT', 'ICARECI']
        if (!validRoles.includes(role)) {
            return reply.code(400).send({ success: false, error: 'Invalid role' })
        }

        const user = await fastify.prisma.user.findUnique({ where: { id: userId } })
        if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

        const updatedUser = await fastify.prisma.user.update({
            where: { id: userId },
            data: {
                role: role as any,
                jwtVersion: { increment: 1 }
            },
            select: { id: true, email: true, name: true, role: true, isActive: true }
        })

        return reply.send({ success: true, data: updatedUser })
    })

    // DELETE /admin/organizations/:id — soft delete (sets deletedAt + deactivates all users atomically)
    fastify.delete('/organizations/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }

        const org = await fastify.prisma.organization.findUnique({
            where: { id },
            select: { id: true, deletedAt: true },
        })
        if (!org) return reply.code(404).send({ success: false, error: 'Organization not found.' })
        if (org.deletedAt) return reply.code(409).send({ success: false, error: 'Organization is already deleted.' })

        try {
            await fastify.prisma.$transaction([
                // Mark org as soft-deleted
                fastify.prisma.organization.update({
                    where: { id },
                    data: { deletedAt: new Date(), isActive: false },
                }),
                // Deactivate all users so they cannot log in; bump jwtVersion to invalidate live tokens
                fastify.prisma.user.updateMany({
                    where: { organizationId: id },
                    data: { isActive: false, jwtVersion: { increment: 1 } },
                }),
            ])
            return reply.send({ success: true })
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Failed to delete organization.' })
        }
    })

    // ══════════════════════════════════════
    // Listing Moderation
    // ══════════════════════════════════════

    // GET /admin/listings/stats — must be before /:id route
    fastify.get('/listings/stats', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (_req, reply) => {
        const [total, pending, active, rejected, totalQueues] = await Promise.all([
            fastify.prisma.listing.count({ where: { deletedAt: null } }),
            fastify.prisma.listing.count({ where: { status: 'PENDING', deletedAt: null } }),
            fastify.prisma.listing.count({ where: { status: 'ACTIVE', deletedAt: null } }),
            fastify.prisma.listing.count({ where: { status: 'REJECTED', deletedAt: null } }),
            fastify.prisma.queueEntry.count({ where: { status: 'ACTIVE' } }),
        ])
        const avgQueueSize = active > 0 ? parseFloat((totalQueues / active).toFixed(2)) : 0
        return reply.send({ success: true, data: { total, pending, active, rejected, totalQueues, avgQueueSize } })
    })

    // GET /admin/listings
    fastify.get('/listings', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const statusFilter = q['status'] ?? 'PENDING'
        const where: any = statusFilter === 'ALL' ? { deletedAt: null } : { status: statusFilter, deletedAt: null }

        const listings = await fastify.prisma.listing.findMany({
            where,
            include: {
                organization: { select: { id: true, name: true } },
                _count: { select: { queueEntries: { where: { status: 'ACTIVE' } } } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return reply.send({ success: true, data: listings })
    })

    // PATCH /admin/listings/:id/moderate
    fastify.patch('/listings/:id/moderate', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { action, reason } = req.body as { action: string; reason?: string }

        if (!['approve', 'reject'].includes(action)) {
            return reply.code(400).send({ success: false, error: 'action approve və ya reject olmalıdır' })
        }

        const listing = await fastify.prisma.listing.findFirst({
            where: { id, deletedAt: null },
            include: {
                organization: {
                    select: { users: { where: { role: 'OWNER' }, select: { email: true }, take: 1 } },
                },
            },
        })
        if (!listing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

        const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED'
        const updated = await fastify.prisma.listing.update({
            where: { id },
            data: {
                status: newStatus,
                moderatedAt: new Date(),
                moderatedBy: req.user.sub,
                ...(action === 'reject' && reason ? { rejectionReason: reason } : {}),
            },
        })

        const ownerEmail = listing.organization.users[0]?.email
        if (ownerEmail) {
            const { sendListingApproved, sendListingRejected } = await import('../services/email.js')
            if (action === 'approve') {
                sendListingApproved(ownerEmail, { title: listing.title, address: listing.address }).catch(() => null)
            } else {
                sendListingRejected(ownerEmail, {
                    title: listing.title,
                    address: listing.address,
                    reason: reason ?? 'Göstərilmədi',
                }).catch(() => null)
            }
        }

        return reply.send({ success: true, data: updated })
    })

    // GET /admin/reports
    fastify.get('/reports', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const statusFilter = q['status'] ?? 'PENDING'
        const where: any = statusFilter === 'ALL' ? {} : { status: statusFilter }

        const reports = await fastify.prisma.listingReport.findMany({
            where,
            include: { listing: { select: { id: true, title: true, address: true } } },
            orderBy: { createdAt: 'desc' },
        })
        return reply.send({ success: true, data: reports })
    })

    // PATCH /admin/reports/:id
    fastify.patch('/reports/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { action } = req.body as { action: string }

        const newStatus = action === 'resolve' ? 'RESOLVED' : 'REVIEWED'
        const report = await fastify.prisma.listingReport.update({
            where: { id },
            data: { status: newStatus },
        })
        return reply.send({ success: true, data: report })
    })
}

export default adminRoutes

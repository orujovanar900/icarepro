import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { writeAuditLog } from '../utils/audit.js'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12

const PLATFORM_STAFF_ROLES = ['MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT'] as const

const PLAN_PRICES: Record<string, number> = {
    FREE_TRIAL: 0,
    BASHLANQIC: 29,
    BIZNES: 69,
    KORPORATIV: 149,
    PROFESSIONAL: 49,
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /admin/stats — Full SuperAdmin Dashboard Data
    fastify.get('/stats', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'FINANCE'])] }, async (req, reply) => {
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

        // FINANCE role: return only financial/subscription data — no org-level operational details
        if (req.user.role === 'FINANCE') {
            return reply.send({
                success: true,
                data: {
                    overview: {
                        totalOrganizations,
                        activePlans,
                        newThisMonth,
                        newThisMonthGrowth: growthPct,
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
                }
            })
        }

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
    fastify.get('/users', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'SUPPORT'])] }, async (req, reply) => {
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
    fastify.get('/organizations/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'SUPPORT'])] }, async (req, reply) => {
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
    fastify.get('/listings/stats', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'MODERATOR'])] }, async (_req, reply) => {
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
    fastify.get('/listings', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'MODERATOR'])] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const statusFilter = q['status'] ?? 'PENDING'
        const where: any = statusFilter === 'ALL' ? { deletedAt: null } : { status: statusFilter, deletedAt: null }

        const listings = await fastify.prisma.listing.findMany({
            where,
            select: {
                id: true, title: true, type: true, district: true, address: true,
                floor: true, totalFloors: true, area: true, rooms: true,
                description: true,
                // basePrice intentionally included for SUPERADMIN moderation view
                // never exposed in public-facing routes
                basePrice: true,
                availStatus: true, status: true, rejectionReason: true,
                isVip: true, isPushed: true, isPanorama: true,
                photos: true, lat: true, lng: true,
                publisherType: true, publisherName: true,
                moderatedAt: true, moderatedBy: true,
                createdAt: true, updatedAt: true, deletedAt: true,
                organization: { select: { id: true, name: true } },
                _count: { select: { queueEntries: { where: { status: 'ACTIVE' } } } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return reply.send({ success: true, data: listings })
    })

    // PATCH /admin/listings/:id/moderate
    fastify.patch('/listings/:id/moderate', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'MODERATOR'])] }, async (req, reply) => {
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

        // Audit trail — always record who moderated what and when
        await writeAuditLog(fastify.prisma, {
            organizationId: listing.organizationId,
            userId: req.user.sub,
            action: action === 'approve' ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
            entityType: 'Listing',
            entityId: listing.id,
            metadata: {
                moderatedBy: req.user.sub,
                newStatus,
                ...(action === 'reject' && reason ? { reason } : {}),
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
    fastify.get('/reports', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'MODERATOR'])] }, async (req, reply) => {
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
    fastify.patch('/reports/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN', 'MODERATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { action } = req.body as { action: string }

        const newStatus = action === 'resolve' ? 'RESOLVED' : 'REVIEWED'
        const report = await fastify.prisma.listingReport.update({
            where: { id },
            data: { status: newStatus },
        })
        return reply.send({ success: true, data: report })
    })

    // ══════════════════════════════════════
    // Platform Staff Management (SUPERADMIN only)
    // ══════════════════════════════════════

    // GET /admin/staff — list all platform staff
    fastify.get('/staff', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (_req, reply) => {
        const staff = await fastify.prisma.user.findMany({
            where: {
                organizationId: null,
                role: { in: PLATFORM_STAFF_ROLES as any },
            },
            select: {
                id: true, name: true, email: true, role: true,
                isActive: true, createdAt: true, avatarUrl: true, phone: true,
            },
            orderBy: { createdAt: 'desc' },
        })
        return reply.send({ success: true, data: staff })
    })

    // POST /admin/staff — create new platform staff member
    const createStaffSchema = z.object({
        name: z.string().min(2),
        email: z.email(),
        password: z.string().min(8),
        role: z.enum(PLATFORM_STAFF_ROLES),
    })

    fastify.post('/staff', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const parsed = createStaffSchema.safeParse(req.body)
        if (!parsed.success) {
            return reply.code(400).send({ success: false, error: parsed.error.issues[0]?.message || 'Validation error' })
        }
        const { name, email, password, role } = parsed.data

        // Ensure email is globally unique (PostgreSQL allows multiple nulls in composite unique, so enforce at app level)
        const existing = await fastify.prisma.user.findFirst({ where: { email } })
        if (existing) {
            return reply.code(409).send({ success: false, error: 'Bu e-poçt ünvanı artıq istifadə olunur.' })
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

        let staff: { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: Date }
        try {
            staff = await fastify.prisma.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    role: role as any,
                    organizationId: null,
                    isActive: true,
                },
                select: {
                    id: true, name: true, email: true, role: true,
                    isActive: true, createdAt: true,
                },
            })
        } catch (err: any) {
            // Handle unique constraint violation on email (P2002) from concurrent requests
            if (err?.code === 'P2002') {
                return reply.code(409).send({ success: false, error: 'Bu e-poçt ünvanı artıq istifadə olunur.' })
            }
            throw err
        }

        // Send welcome email asynchronously
        const { sendStaffWelcome } = await import('../services/email.js')
        sendStaffWelcome(email, { name, role, tempPassword: password }).catch(() => null)

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId: req.user.sub,
            action: 'STAFF_CREATED',
            entityType: 'User',
            entityId: staff.id,
            metadata: { role, createdBy: req.user.sub },
        })

        return reply.code(201).send({ success: true, data: staff })
    })

    // PATCH /admin/staff/:id — update role, isActive, or name
    fastify.patch('/staff/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { role, isActive, name } = req.body as { role?: string; isActive?: boolean; name?: string }

        const staff = await fastify.prisma.user.findFirst({
            where: { id, organizationId: null },
        })
        if (!staff) return reply.code(404).send({ success: false, error: 'Staff member not found' })

        // Prevent demoting any SUPERADMIN via this endpoint
        if (staff.role === 'SUPERADMIN' && role && role !== 'SUPERADMIN') {
            return reply.code(400).send({ success: false, error: 'SUPERADMIN rolunu bu endpointdən dəyişmək olmaz.' })
        }

        if (role && !PLATFORM_STAFF_ROLES.includes(role as any)) {
            return reply.code(400).send({ success: false, error: 'Yalnız platform staff rolları icazəlidir.' })
        }

        // Prisma update payload (may include Prisma operators like { increment: 1 })
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (role !== undefined) updateData.role = role
        if (isActive !== undefined) updateData.isActive = isActive
        if (isActive === false || role !== undefined) updateData.jwtVersion = { increment: 1 }

        const updated = await fastify.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true, name: true, email: true, role: true,
                isActive: true, createdAt: true,
            },
        })

        // Audit metadata — only scalar changes, no Prisma operators
        const auditChanges: Record<string, unknown> = {}
        if (name !== undefined) auditChanges['name'] = name
        if (role !== undefined) auditChanges['role'] = role
        if (isActive !== undefined) auditChanges['isActive'] = isActive

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId: req.user.sub,
            action: 'STAFF_UPDATED',
            entityType: 'User',
            entityId: id,
            metadata: { changes: auditChanges, updatedBy: req.user.sub },
        })

        return reply.send({ success: true, data: updated })
    })

    // DELETE /admin/staff/:id — hard delete (platform staff are not org data)
    fastify.delete('/staff/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }

        if (id === req.user.sub) {
            return reply.code(400).send({ success: false, error: 'Özünüzü silə bilməzsiniz.' })
        }

        const staff = await fastify.prisma.user.findFirst({
            where: { id, organizationId: null },
        })
        if (!staff) return reply.code(404).send({ success: false, error: 'Staff member not found' })

        await fastify.prisma.user.delete({ where: { id } })

        await writeAuditLog(fastify.prisma, {
            organizationId: null,
            userId: req.user.sub,
            action: 'STAFF_DELETED',
            entityType: 'User',
            entityId: id,
            metadata: { deletedEmail: staff.email, deletedBy: req.user.sub },
        })

        return reply.send({ success: true })
    })
}

export default adminRoutes

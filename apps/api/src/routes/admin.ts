import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /admin/stats
    fastify.get('/stats', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const [
            totalOrganizations,
            totalProperties,
            totalContracts,
            revenueResult,
            recentSignups,
            activeOrganizations
        ] = await Promise.all([
            fastify.prisma.organization.count(),
            fastify.prisma.property.count(),
            fastify.prisma.contract.count(),
            fastify.prisma.payment.aggregate({
                _sum: { amount: true }
            }),
            fastify.prisma.organization.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            }),
            fastify.prisma.organization.count({
                where: { isActive: true }
            })
        ])

        return reply.send({
            success: true,
            data: {
                totalOrganizations,
                totalProperties,
                totalContracts,
                totalRevenue: Number(revenueResult._sum.amount || 0),
                newSignupsThisMonth: recentSignups,
                activeOrganizations,
                inactiveOrganizations: totalOrganizations - activeOrganizations
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
                    select: { users: true, properties: true, contracts: true }
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
            createdAt: org.createdAt,
            plan: org.plan,
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

    // DELETE /admin/organizations/:id
    fastify.delete('/organizations/:id', { preHandler: [authenticate, requireRole(['SUPERADMIN'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }

        // In a real application, you might want to mark as deleted rather than hard deleting,
        // or ensure cascading deletes are handled properly by Prisma.
        // Assuming Prisma handles cascading deletes for this example if needed, or we just rely on it.
        try {
            await fastify.prisma.organization.delete({
                where: { id }
            })
            return reply.send({ success: true })
        } catch (error) {
            console.error(error)
            return reply.code(500).send({ success: false, error: 'Failed to delete organization. Ensure all related records are deleted first or cascading is enabled.' })
        }
    })
}

export default adminRoutes

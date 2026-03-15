import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
const querySchema = z.object({
    month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1),
    year: z.coerce.number().int().min(2020).default(new Date().getFullYear()),
})

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = querySchema.safeParse(req.query)
        if (!q.success) return sendZodError(reply, q.error)

        const { month, year } = q.data
        const org = withOrg(req)
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0, 23, 59, 59)

        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        const prevMonthStart = new Date(prevYear, prevMonth - 1, 1)
        const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59)

        const now = new Date()
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

        // Параллельные запросы
        const [
            monthlyIncomeAgg,
            monthlyExpensesAgg,
            activeContracts,
            totalProperties,
            expiringContractsRaw,
            prevMonthlyIncomeAgg,
            activeListings,
            totalQueueEntries,
        ] = await Promise.all([
            fastify.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { ...org, paymentDate: { gte: monthStart, lte: monthEnd } },
            }),
            fastify.prisma.expense.aggregate({
                _sum: { amount: true },
                where: { ...org, date: { gte: monthStart, lte: monthEnd } },
            }),
            fastify.prisma.contract.findMany({
                where: { ...org, status: 'ACTIVE' },
                include: {
                    tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true } },
                    property: { select: { name: true } },
                    payments: { select: { amount: true } },
                },
            }),
            fastify.prisma.property.count({ where: { ...org, isActive: true } }),
            fastify.prisma.contract.findMany({
                where: { ...org, status: 'ACTIVE', endDate: { gte: now, lte: in60Days } },
                select: {
                    id: true,
                    number: true,
                    endDate: true,
                    tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true } },
                    property: { select: { name: true } },
                },
                orderBy: { endDate: 'asc' },
            }),
            fastify.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { ...org, paymentDate: { gte: prevMonthStart, lte: prevMonthEnd } },
            }),
            fastify.prisma.listing.count({ where: { ...org, status: 'ACTIVE', deletedAt: null } }),
            fastify.prisma.queueEntry.count({
                where: { listing: { ...org, deletedAt: null }, status: 'ACTIVE' },
            }),
        ])

        const monthlyIncome = Number(monthlyIncomeAgg._sum.amount ?? 0)
        const monthlyExpenses = Number(monthlyExpensesAgg._sum.amount ?? 0)
        const prevMonthIncome = Number(prevMonthlyIncomeAgg._sum.amount ?? 0)
        const balance = monthlyIncome - monthlyExpenses

        // Занятость
        const occupiedCount = activeContracts.length
        const occupancyRate = totalProperties > 0
            ? Math.round((occupiedCount / totalProperties) * 100)
            : 0

        // Один запрос: сумма платежей за выбранный месяц по каждому контракту
        const contractIds = activeContracts.map((c: any) => c.id)
        const monthPaymentsRaw = contractIds.length > 0
            ? await fastify.prisma.payment.groupBy({
                by: ['contractId'],
                _sum: { amount: true },
                where: { contractId: { in: contractIds }, periodMonth: month, periodYear: year },
            })
            : []
        const monthPaymentMap = new Map(monthPaymentsRaw.map((r: any) => [r.contractId, Number(r._sum.amount ?? 0)]))

        // Income forecast: sum of monthly rent for all active contracts
        let incomeForecast = 0
        const debtors: Array<{
            contractId: string
            contractNumber: string
            tenantName: string
            propertyName: string
            debtAmount: number
            daysOverdue: number
        }> = []

        for (const c of activeContracts) {
            incomeForecast += Number(c.monthlyRent)
        }

        // NEW: Payment.status-based debt calculation
        const debtPayments = await fastify.prisma.payment.findMany({
            where: {
                ...withOrg(req),
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                deletedAt: null,
            },
            select: {
                status: true,
                amount: true,
                expectedAmount: true,
                contractId: true,
                periodMonth: true,
                periodYear: true,
            },
        })

        const overdueDebt = debtPayments
            .filter(p => p.status === 'OVERDUE')
            .reduce((sum, p) => sum + Number(p.expectedAmount ?? 0), 0)

        const currentDebt = debtPayments
            .filter(p => p.status === 'UNPAID')
            .reduce((sum, p) => sum + Number(p.expectedAmount ?? 0), 0)

        const partialDebt = debtPayments
            .filter(p => p.status === 'PARTIAL')
            .reduce((sum, p) => sum + Math.max(0, Number(p.expectedAmount ?? 0) - Number(p.amount)), 0)

        const totalDebt = overdueDebt + currentDebt + partialDebt
        const currentMonthDebt = currentDebt // kept for backwards compatibility

        // Build debtors list from debt payments (grouped by contractId)
        const debtByContract = new Map<string, number>()
        for (const p of debtPayments) {
            const existing = debtByContract.get(p.contractId) ?? 0
            const owed = p.status === 'PARTIAL'
                ? Math.max(0, Number(p.expectedAmount ?? 0) - Number(p.amount))
                : Number(p.expectedAmount ?? 0)
            debtByContract.set(p.contractId, existing + owed)
        }

        for (const c of activeContracts) {
            const debtAmount = debtByContract.get(c.id) ?? 0
            if (debtAmount > 0) {
                const now = new Date()
                // Estimate daysOverdue from oldest overdue payment for this contract
                const oldestOverdue = debtPayments
                    .filter(p => p.contractId === c.id && (p.status === 'OVERDUE') && p.periodYear && p.periodMonth)
                    .sort((a, b) => {
                        const aDate = new Date(a.periodYear!, a.periodMonth! - 1, 1)
                        const bDate = new Date(b.periodYear!, b.periodMonth! - 1, 1)
                        return aDate.getTime() - bDate.getTime()
                    })[0]

                let daysOverdue = 0
                if (oldestOverdue?.periodYear && oldestOverdue?.periodMonth) {
                    const overdueSince = new Date(oldestOverdue.periodYear, oldestOverdue.periodMonth - 1, 1)
                    if (overdueSince < now) {
                        daysOverdue = Math.floor((now.getTime() - overdueSince.getTime()) / (1000 * 60 * 60 * 24))
                    }
                }

                debtors.push({
                    contractId: c.id,
                    contractNumber: c.number,
                    tenantName: c.tenant.tenantType === 'fiziki'
                        ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim()
                        : c.tenant.companyName || '',
                    propertyName: c.property.name,
                    debtAmount,
                    daysOverdue,
                })
            }
        }

        // 12-месячный график: 2 groupBy запроса вместо 24 aggregate
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year, 11, 31, 23, 59, 59)

        const [yearPayments, yearExpensesRaw] = await Promise.all([
            fastify.prisma.payment.groupBy({
                by: ['periodMonth'],
                _sum: { amount: true },
                where: { ...org, periodYear: year },
                orderBy: { periodMonth: 'asc' },
            }),
            fastify.prisma.expense.findMany({
                where: { ...org, date: { gte: yearStart, lte: yearEnd } },
                select: { amount: true, date: true },
            }),
        ])

        const incomeByMonth = new Map(yearPayments.map((r: any) => [r.periodMonth ?? 0, Number(r._sum.amount ?? 0)]))

        // Group expenses by calendar month — Expense has no periodMonth field, only date
        const expensesByMonth = new Map<number, number>()
        for (const e of yearExpensesRaw) {
            const m = new Date(e.date).getMonth() + 1
            expensesByMonth.set(m, (expensesByMonth.get(m) ?? 0) + Number(e.amount))
        }

        const monthlyChart = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            income: incomeByMonth.get(i + 1) ?? 0,
            expenses: expensesByMonth.get(i + 1) ?? 0,
        }))

        const expiringContracts = expiringContractsRaw.map((c: any) => ({
            contractId: c.id,
            number: c.number,
            tenantName: c.tenant.tenantType === 'fiziki' ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim() : c.tenant.companyName || '',
            propertyName: c.property.name,
            endDate: c.endDate,
            daysLeft: Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        }))

        return reply.send({
            success: true,
            data: {
                balance,
                monthlyIncome,
                prevMonthIncome,
                monthlyExpenses,
                totalDebt,
                overdueDebt,
                currentDebt,
                partialDebt,
                currentMonthDebt,
                incomeForecast,
                occupancyRate,
                debtors,
                monthlyChart,
                expiringContracts,
                activeListings,
                totalQueueEntries,
            },
        })
    })
}

export default dashboardRoutes

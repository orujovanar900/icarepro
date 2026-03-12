import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { calculateContractDebtAndExpected, getDueDateForPaymentIndex } from '../utils/contractUtils.js'
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

        // Долги по активным контрактам
        let totalDebt = 0
        let currentMonthDebt = 0
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
            // Forecast logic: sum up monthly rent of valid active contracts
            incomeForecast += Number(c.monthlyRent)

            const now = new Date()
            const start = new Date(c.startDate)
            const end = c.endDate < now ? new Date(c.endDate) : now

            const totalExpected = calculateContractDebtAndExpected(c, now)
            const totalPaid = c.payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
            const debt = Math.max(0, totalExpected - totalPaid)
            totalDebt += debt

            // Долг за выбранный месяц — из pre-fetched map
            const isInPeriod = c.startDate <= monthEnd && c.endDate >= monthStart
            if (isInPeriod) {
                const monthPaid = monthPaymentMap.get(c.id) ?? 0
                currentMonthDebt += Math.max(0, Number(c.monthlyRent as any) - (monthPaid as any))
            }

            if (debt > 0) {
                let daysOverdue = 0
                const monthsPaidFully = Math.floor(totalPaid / Number(c.monthlyRent))
                const expectedDate = getDueDateForPaymentIndex(c, monthsPaidFully)

                if (expectedDate < now) {
                    const diffTime = Math.abs(now.getTime() - expectedDate.getTime())
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                }

                debtors.push({
                    contractId: c.id,
                    contractNumber: c.number,
                    tenantName: c.tenant.tenantType === 'fiziki' ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim() : c.tenant.companyName || '',
                    propertyName: c.property.name,
                    debtAmount: debt,
                    daysOverdue,
                })
            }
        }

        // 12-месячный график: 2 groupBy запроса вместо 24 aggregate
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year, 11, 31, 23, 59, 59)

        const [yearPayments, yearExpensesAgg] = await Promise.all([
            fastify.prisma.payment.groupBy({
                by: ['periodMonth'],
                _sum: { amount: true },
                where: { ...org, periodYear: year },
                orderBy: { periodMonth: 'asc' },
            }),
            fastify.prisma.expense.aggregate({
                _sum: { amount: true },
                where: { ...org, date: { gte: yearStart, lte: yearEnd } },
            }),
        ])

        const incomeByMonth = new Map(yearPayments.map((r: any) => [r.periodMonth ?? 0, Number(r._sum.amount ?? 0)]))
        const totalYearExpenses = Number(yearExpensesAgg._sum.amount ?? 0)

        const monthlyChart = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            income: incomeByMonth.get(i + 1) ?? 0,
            expenses: Math.round(totalYearExpenses / 12),
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
                currentMonthDebt,
                incomeForecast,
                occupancyRate,
                debtors,
                monthlyChart,
                expiringContracts,
                activeListings,
            },
        })
    })
}

export default dashboardRoutes

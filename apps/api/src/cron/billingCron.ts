import type { PrismaClient } from '@prisma/client'
import { calculateNextPeriod, getDueDate, isOverdue } from '../utils/contractUtils.js'

/**
 * generateUnpaidRecords — runs daily to create UNPAID payment records
 * for the upcoming billing period. Skips RESIDENTIAL_SHORT and PARKING contracts.
 */
export async function generateUnpaidRecords(prisma: PrismaClient): Promise<void> {
    const contracts = await prisma.contract.findMany({
        where: {
            status: 'ACTIVE',
            deletedAt: null,
            rentalType: { notIn: ['RESIDENTIAL_SHORT', 'PARKING'] },
        },
        select: {
            id: true,
            organizationId: true,
            monthlyRent: true,
            paymentDay: true,
            fixedPaymentDay: true,
            gracePeriodDays: true,
            paymentTiming: true,
            startDate: true,
        },
    })

    for (const contract of contracts) {
        try {
            const today = new Date()
            const { periodStart, periodEnd, amount } = calculateNextPeriod(contract, today)
            const periodMonth = periodStart.getMonth() + 1
            const periodYear = periodStart.getFullYear()

            // Check if a record already exists for this period
            const existing = await prisma.payment.findFirst({
                where: {
                    contractId: contract.id,
                    periodMonth,
                    periodYear,
                    deletedAt: null,
                },
                select: { id: true },
            })

            if (!existing) {
                await prisma.payment.create({
                    data: {
                        contractId: contract.id,
                        organizationId: contract.organizationId,
                        amount: 0,
                        expectedAmount: amount,
                        status: 'UNPAID',
                        periodMonth,
                        periodYear,
                        paymentDate: periodStart, // placeholder date
                        paymentType: 'CASH',      // placeholder paymentType (required field)
                        isPenalty: false,
                        createdBy: contract.organizationId, // system-generated
                    } as never,
                })
                console.log(`[BillingCron] Generated UNPAID for contract ${contract.id} period ${periodMonth}/${periodYear}`)
            }

            // Suppress unused variable warning for periodEnd (used implicitly)
            void periodEnd
        } catch (err) {
            console.error(`[BillingCron] Failed to generate UNPAID for contract ${contract.id}:`, err)
        }
    }
}

/**
 * markOverduePayments — runs daily to mark UNPAID/PARTIAL payments as OVERDUE
 * when their due date has passed.
 */
export async function markOverduePayments(prisma: PrismaClient): Promise<void> {
    const pendingPayments = await prisma.payment.findMany({
        where: {
            status: { in: ['UNPAID', 'PARTIAL'] },
            deletedAt: null,
        },
        select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            contract: {
                select: {
                    paymentDay: true,
                    fixedPaymentDay: true,
                    gracePeriodDays: true,
                    paymentTiming: true,
                },
            },
        },
    })

    for (const payment of pendingPayments) {
        try {
            if (!payment.contract) continue
            if (!payment.periodMonth || !payment.periodYear) continue

            // Reconstruct period dates from periodMonth/periodYear
            const periodStart = new Date(payment.periodYear, payment.periodMonth - 1, 1)
            const periodEnd = new Date(payment.periodYear, payment.periodMonth, 0) // last day of month

            const dueDate = getDueDate(payment.contract, periodStart, periodEnd)

            if (isOverdue(dueDate)) {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: 'OVERDUE' as never },
                })
                console.warn(`[BillingCron] Payment ${payment.id} marked OVERDUE (due: ${dueDate.toISOString()})`)
            }
        } catch (err) {
            console.error(`[BillingCron] Failed to check overdue for payment ${payment.id}:`, err)
        }
    }
}

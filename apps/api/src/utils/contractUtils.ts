import { Prisma } from '@prisma/client'

export function calculateContractDebtAndExpected(contract: any, referenceDate: Date = new Date()) {
    const start = new Date(contract.startDate);
    const end = contract.endDate && new Date(contract.endDate) < referenceDate 
        ? new Date(contract.endDate) 
        : referenceDate;
    
    let totalExpected = 0;
    
    // Safety check
    if (end < start) return 0;

    if (contract.paymentMode === 'FIXED_DAY') {
        const pDay = contract.paymentDay || start.getDate();
        
        let expectedMonths = 0;
        const current = new Date(start);
        
        // Count how many billing cycles have started
        while (current <= end) {
            expectedMonths++;
            // Move to next month's payment day
            current.setMonth(current.getMonth() + 1);
            // Handle day overflow (e.g. Jan 31 -> Feb 31 auto-corrects). We want max day.
            const maxDaysInNewMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            if (pDay > maxDaysInNewMonth) {
                 current.setDate(maxDaysInNewMonth);
            } else {
                 current.setDate(pDay);
            }
        }
        totalExpected = Number(contract.monthlyRent) * expectedMonths;
    } else {
        // CALENDAR MODE
        // Example: Jan 15 to Mar 5
        let expected = 0;
        const current = new Date(start);

        while (current <= end) {
             const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
             const isStartMonth = current.getFullYear() === start.getFullYear() && current.getMonth() === start.getMonth();
             const isEndMonth = current.getFullYear() === end.getFullYear() && current.getMonth() === end.getMonth();

             let activeDaysInMonth = daysInMonth;
             
             if (isStartMonth && isEndMonth) {
                  activeDaysInMonth = end.getDate() - start.getDate() + 1;
             } else if (isStartMonth) {
                  activeDaysInMonth = daysInMonth - start.getDate() + 1;
             } else if (isEndMonth) {
                  // Always bill only the actual days used in the end month.
                  // Removed the ACTIVE-status override that was billing the full month even
                  // for contracts ending mid-month (e.g. ending Mar 15 billed all 31 days of Mar).
                  activeDaysInMonth = end.getDate();
             }
             
             expected += (Number(contract.monthlyRent) / daysInMonth) * activeDaysInMonth;
             
             // Move to next month
             current.setMonth(current.getMonth() + 1);
             current.setDate(1); // Set to 1st of the month
        }
        totalExpected = expected;
    }
    
    return totalExpected;
}

export function getNextPaymentDate(contract: any): Date {
    const start = new Date(contract.startDate);
    const now = new Date();
    
    if (contract.paymentMode === 'FIXED_DAY') {
        const pDay = contract.paymentDay || start.getDate();
        let nextDate = new Date(now.getFullYear(), now.getMonth(), pDay);
        
        if (now.getDate() >= pDay) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        
        const maxDaysNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (pDay > maxDaysNextMonth) {
            nextDate.setDate(maxDaysNextMonth);
        }
        return nextDate;
    } else {
        // CALENDAR mode: always 1st of next month
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
}

export function getDueDateForPaymentIndex(contract: any, index: number): Date {
    const start = new Date(contract.startDate);
    if (contract.paymentMode === 'FIXED_DAY') {
         const pDay = contract.paymentDay || start.getDate();
         const d = new Date(start.getFullYear(), start.getMonth() + index, pDay);
         const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
         if (pDay > maxDay) d.setDate(maxDay);
         return d;
    } else {
         if (index === 0) return start;
         return new Date(start.getFullYear(), start.getMonth() + index, 1);
    }
}

// ─────────────────────────────────────────
// Billing Overhaul — new period/due-date helpers
// ─────────────────────────────────────────

// Helper: days in a month
function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

// Helper: add days to a date (returns new Date)
function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

// Helper: last day of a month
function lastDayOfMonth(year: number, month: number): Date {
    return new Date(year, month, 0)
}

export interface PeriodResult {
    proposedAmount: Prisma.Decimal | null
    periodStart: Date
    periodEnd: Date
}

export interface NextPeriodResult {
    amount: Prisma.Decimal
    periodStart: Date
    periodEnd: Date
}

/**
 * calculateFirstPeriod — calculates the first billing period for a new contract.
 * - fixedPaymentDay=false: pro-rated from startDate to end of start month
 * - fixedPaymentDay=true: manual entry (proposedAmount=null), period is startDate to day before first paymentDay
 */
export function calculateFirstPeriod(contract: {
    startDate: Date
    monthlyRent: Prisma.Decimal
    paymentDay: number | null
    fixedPaymentDay: boolean
}): PeriodResult {
    const start = new Date(contract.startDate)

    if (!contract.fixedPaymentDay) {
        // Stabilize to 1st: pro-rate from startDate to end of start month
        const year = start.getFullYear()
        const month = start.getMonth() + 1 // 1-indexed
        const totalDays = daysInMonth(year, month)
        const dayOfMonth = start.getDate()
        const remainingDays = totalDays - dayOfMonth + 1 // inclusive of start day

        const monthlyRentNum = Number(contract.monthlyRent)
        const prorated = (monthlyRentNum / totalDays) * remainingDays
        const proratedDecimal = new Prisma.Decimal(prorated.toFixed(2))

        const periodEnd = lastDayOfMonth(year, month)

        return {
            proposedAmount: proratedDecimal,
            periodStart: start,
            periodEnd,
        }
    } else {
        // Fixed cycle: manual first period, from startDate to day before first paymentDay
        const paymentDay = contract.paymentDay ?? 1
        let firstPaymentDate = new Date(start.getFullYear(), start.getMonth(), paymentDay)
        if (firstPaymentDate <= start) {
            // Payment day already passed this month → next month
            firstPaymentDate = new Date(start.getFullYear(), start.getMonth() + 1, paymentDay)
        }
        const periodEnd = addDays(firstPaymentDate, -1)

        return {
            proposedAmount: null,
            periodStart: start,
            periodEnd,
        }
    }
}

/**
 * calculateNextPeriod — calculates the next billing period after a given date.
 * - fixedPaymentDay=false: next full month starting on the 1st
 * - fixedPaymentDay=true: next paymentDay cycle
 */
export function calculateNextPeriod(
    contract: {
        monthlyRent: Prisma.Decimal
        paymentDay: number | null
        fixedPaymentDay: boolean
    },
    afterDate: Date
): NextPeriodResult {
    const after = new Date(afterDate)

    if (!contract.fixedPaymentDay) {
        // Next 1st of month after afterDate
        const nextMonth = new Date(after.getFullYear(), after.getMonth() + 1, 1)
        const year = nextMonth.getFullYear()
        const month = nextMonth.getMonth() + 1
        const periodEnd = lastDayOfMonth(year, month)

        return {
            amount: contract.monthlyRent,
            periodStart: nextMonth,
            periodEnd,
        }
    } else {
        // Next paymentDay cycle
        const paymentDay = contract.paymentDay ?? 1
        let periodStart = new Date(after.getFullYear(), after.getMonth(), paymentDay)
        if (periodStart <= after) {
            periodStart = new Date(after.getFullYear(), after.getMonth() + 1, paymentDay)
        }
        const periodEnd = addDays(
            new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, paymentDay),
            -1
        )

        return {
            amount: contract.monthlyRent,
            periodStart,
            periodEnd,
        }
    }
}

/**
 * getDueDate — calculates when payment is due based on timing and period.
 * - PREPAID: periodStart + gracePeriodDays
 * - POSTPAID: periodEnd + gracePeriodDays
 * - fixedPaymentDay=true: always periodStart + (paymentDay - 1) days
 */
export function getDueDate(
    contract: {
        paymentTiming: string
        gracePeriodDays: number | null
        paymentDay: number | null
        fixedPaymentDay: boolean
    },
    periodStart: Date,
    periodEnd: Date
): Date {
    const grace = contract.gracePeriodDays ?? 0

    if (contract.fixedPaymentDay) {
        const paymentDay = contract.paymentDay ?? 1
        return addDays(periodStart, paymentDay - 1)
    }

    if (contract.paymentTiming === 'POSTPAID') {
        return addDays(periodEnd, grace)
    }

    // PREPAID (default)
    return addDays(periodStart, grace)
}

/**
 * isOverdue — returns true if dueDate is in the past.
 */
export function isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate
}

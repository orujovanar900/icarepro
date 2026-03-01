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
                  // For the end month, if the contract is ACTIVE, do they owe the FULL month on the 1st?
                  // The prompt says "Then Feb 1, Mar 1, Apr 1...". This implies full month billed on the 1st.
                  activeDaysInMonth = contract.status === 'ACTIVE' ? daysInMonth : end.getDate();
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

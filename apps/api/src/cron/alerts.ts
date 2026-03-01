import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendDebtAlert, sendExpiringContractAlert } from '../services/email.js';

// Run every day at 09:00 Baku time
cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily alerts...');

    // 1. Find all organizations with their owner email
    const orgs = await prisma.organization.findMany({
        include: { users: { where: { role: 'OWNER' } } }
    });

    for (const org of orgs) {
        const owner = org.users[0];
        if (!owner) continue;

        // 2. Debt alerts — contracts with debt > 0
        const activeContracts = await prisma.contract.findMany({
            where: { organizationId: org.id, status: 'ACTIVE' },
            include: { tenant: true, property: true }
        });

        for (const contract of activeContracts) {
            // Compute debt
            const totalPaidAgg = await prisma.payment.aggregate({
                _sum: { amount: true },
                where: { contractId: contract.id },
            });
            const totalPaid = Number(totalPaidAgg._sum.amount ?? 0);

            const now = new Date();
            const start = new Date(contract.startDate);
            const end = contract.endDate < now ? new Date(contract.endDate) : now;
            const monthsElapsed = Math.max(0,
                (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
            );
            const totalExpected = Number(contract.monthlyRent) * monthsElapsed;
            const debt = Math.max(0, totalExpected - totalPaid);

            if (debt > 0) {
                const tenantName = contract.tenant.tenantType === 'fiziki'
                    ? `${contract.tenant.firstName || ''} ${contract.tenant.lastName || ''}`.trim()
                    : contract.tenant.companyName || ''
                await sendDebtAlert(owner.email, {
                    tenantName,
                    propertyName: contract.property.name,
                    debtAmount: Number(debt.toFixed(2)),
                    contractNumber: contract.number
                });
            }
        }

        // 3. Expiring contracts — ending in 30 or 60 days
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const in30 = new Date(today);
        in30.setDate(today.getDate() + 30);
        const in30Str = in30.toISOString().split('T')[0];

        const in60 = new Date(today);
        in60.setDate(today.getDate() + 60);
        const in60Str = in60.toISOString().split('T')[0];

        const expiringContracts = await prisma.contract.findMany({
            where: {
                organizationId: org.id,
                status: 'ACTIVE',
                // Instead of strict BETWEEN, let's just find contracts whose endDate is EXACTLY 30 or 60 days from now, 
                // to prevent spamming them every single day.
            },
            include: { tenant: true, property: true }
        });

        for (const contract of expiringContracts) {
            const contractEndDateStr = new Date(contract.endDate).toISOString().split('T')[0];

            let daysLeft = 0;
            if (contractEndDateStr === in30Str) daysLeft = 30;
            else if (contractEndDateStr === in60Str) daysLeft = 60;
            else continue;

            await sendExpiringContractAlert(owner.email, {
                tenantName: contract.tenant.tenantType === 'fiziki'
                    ? `${contract.tenant.firstName || ''} ${contract.tenant.lastName || ''}`.trim()
                    : contract.tenant.companyName || '',
                propertyName: contract.property.name,
                endDate: new Date(contract.endDate).toLocaleDateString('az-AZ'),
                daysLeft,
                contractNumber: contract.number
            });
        }
    }
}, { timezone: "Asia/Baku" });

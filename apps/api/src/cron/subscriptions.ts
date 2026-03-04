import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { logger } from '../logger.js'
import {
    sendPlanExpiryWarning,
    sendGracePeriodReminder,
    sendSuspensionNotice,
    sendFinalDeletionWarning
} from '../services/email.js'

const prisma = new PrismaClient()

// Run every day at 00:00 Baku time
cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily subscription cron job...');
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const organizations = await prisma.organization.findMany({
            include: {
                users: {
                    where: { role: 'OWNER' }
                }
            }
        });

        for (const org of organizations) {
            // Ignore free or strictly manually managed orgs if they don't have plan expires set
            if (!org.planExpiresAt) continue;

            const ownerEmail = org.users[0]?.email;
            if (!ownerEmail) continue;

            // Calculate days difference
            const diffTime = startOfDay.getTime() - org.planExpiresAt.getTime();
            const daysSinceExpiry = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (org.subscriptionStatus === 'ACTIVE') {
                if (daysSinceExpiry === 0) {
                    logger.info(`Org ${org.name} plan expires today. Sending warning.`);
                    await sendPlanExpiryWarning(ownerEmail, org.name);
                } else if (daysSinceExpiry > 0) {
                    logger.info(`Org ${org.name} expired. Moving to GRACE_PERIOD.`);
                    await prisma.organization.update({
                        where: { id: org.id },
                        data: {
                            subscriptionStatus: 'GRACE_PERIOD',
                            gracePeriodStartedAt: new Date(now),
                        }
                    });
                    await sendGracePeriodReminder(ownerEmail, org.name, 10);
                }
            } else if (org.subscriptionStatus === 'GRACE_PERIOD' && org.gracePeriodStartedAt) {
                const diffGrace = startOfDay.getTime() - org.gracePeriodStartedAt.getTime();
                const daysInGrace = Math.floor(diffGrace / (1000 * 60 * 60 * 24));
                const daysLeft = 10 - daysInGrace;

                if (daysInGrace === 3 || daysInGrace === 7) {
                    logger.info(`Org ${org.name} in grace period (day ${daysInGrace}). Sending reminder.`);
                    await sendGracePeriodReminder(ownerEmail, org.name, daysLeft);
                } else if (daysInGrace >= 10) {
                    logger.info(`Org ${org.name} grace period ended. Suspending.`);
                    await prisma.organization.update({
                        where: { id: org.id },
                        data: { subscriptionStatus: 'SUSPENDED' }
                    });
                    await sendSuspensionNotice(ownerEmail, org.name);
                }
            } else if (org.subscriptionStatus === 'SUSPENDED' && org.planExpiresAt) {
                if (daysSinceExpiry === 83) { // 90 total days out, 7 days left warning
                    logger.info(`Org ${org.name} pending deletion in 7 days.`);
                    await sendFinalDeletionWarning(ownerEmail, org.name);
                }
            }
        }
    } catch (error) {
        logger.error('Failed to run subscription cron job: ', error);
    }
}, {
    timezone: 'Asia/Baku'
});

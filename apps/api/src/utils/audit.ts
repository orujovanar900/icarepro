import type { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../logger.js'

interface AuditParams {
    organizationId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
}

type PrismaClientOrTransaction = PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Записывает действие в AuditLog без блокировки основного запроса.
 */
export async function writeAuditLog(prisma: PrismaClientOrTransaction, params: AuditParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                ...(params.metadata !== undefined ? { metadata: params.metadata as never } : {}),
            },
        })
    } catch (err) {
        logger.error(`[AuditLog] Failed to write audit log: ${err instanceof Error ? err.message : String(err)}`, { err })
    }
}

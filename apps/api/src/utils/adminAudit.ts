import type { PrismaClient } from '@prisma/client'
import { logger } from '../logger.js'

interface AdminAuditParams {
    actorUserId?: string
    actorEmail?: string
    action: string
    entityType: string
    entityId?: string
    entityLabel?: string
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    ipAddress?: string
}

/**
 * Inserts a row into admin_audit_log.
 * Non-blocking — errors are logged but never thrown.
 */
export async function logAudit(
    prisma: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
    params: AdminAuditParams,
): Promise<void> {
    try {
        await (prisma as PrismaClient).adminAuditLog.create({
            data: {
                actorUserId: params.actorUserId ?? null,
                actorEmail:  params.actorEmail  ?? null,
                action:      params.action,
                entityType:  params.entityType,
                entityId:    params.entityId    ?? null,
                entityLabel: params.entityLabel ?? null,
                oldValue:    params.oldValue !== undefined ? (params.oldValue as any) : undefined,
                newValue:    params.newValue !== undefined ? (params.newValue as any) : undefined,
                ipAddress:   params.ipAddress   ?? null,
            },
        })
    } catch (err) {
        logger.error(
            `[AdminAuditLog] Failed to write: ${err instanceof Error ? err.message : String(err)}`,
            { err },
        )
    }
}

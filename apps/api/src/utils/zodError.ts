import type { FastifyReply } from 'fastify'
import type { ZodError } from 'zod'

/**
 * Отправляет ошибку Zod как 400 ответ.
 * Совместимо с Zod v4 (.issues вместо .errors).
 */
export function sendZodError(reply: FastifyReply, error: ZodError) {
    const first = error.issues[0]
    return reply.code(400).send({
        success: false,
        error: first?.message ?? 'Validation error',
        details: first?.path.length ? { field: first.path.join('.') } : undefined,
    })
}

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

const updateEntrySchema = z.object({
  priceOffer: z.number().positive().optional(),
  desiredMonths: z.number().int().optional(),
})

const queueRoutes: FastifyPluginAsync = async (fastify) => {

  // PUT /queue/:entryId — update priceOffer or desiredMonths
  fastify.put('/:entryId', { preHandler: [authenticate] }, async (req, reply) => {
    const { entryId } = req.params as { entryId: string }
    const body = updateEntrySchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const entry = await fastify.prisma.queueEntry.findFirst({
      where: { id: entryId, userId: req.user.sub, status: 'ACTIVE' },
      include: { listing: { select: { basePrice: true, status: true } } },
    })
    if (!entry) return reply.code(404).send({ success: false, error: 'Növbə qeydi tapılmadı' })

    if (entry.listing.status !== 'ACTIVE') {
      return reply.code(400).send({ success: false, error: 'Elan aktiv deyil' })
    }

    const newOffer = body.data.priceOffer ?? entry.priceOffer
    if (newOffer < entry.listing.basePrice) {
      return reply.code(400).send({ success: false, error: 'Təklifiniz minimum qiymətdən aşağıdır' })
    }

    const updated = await fastify.prisma.queueEntry.update({
      where: { id: entryId },
      data: { ...body.data },
    })

    return reply.send({ success: true, data: updated })
  })

  // DELETE /queue/:entryId — withdraw and recalculate positions
  fastify.delete('/:entryId', { preHandler: [authenticate] }, async (req, reply) => {
    const { entryId } = req.params as { entryId: string }

    const entry = await fastify.prisma.queueEntry.findFirst({
      where: { id: entryId, userId: req.user.sub, status: 'ACTIVE' },
    })
    if (!entry) return reply.code(404).send({ success: false, error: 'Növbə qeydi tapılmadı' })

    await fastify.prisma.$transaction([
      fastify.prisma.queueEntry.update({
        where: { id: entryId },
        data: { status: 'WITHDRAWN' },
      }),
      fastify.prisma.queueEntry.updateMany({
        where: {
          listingId: entry.listingId,
          status: 'ACTIVE',
          position: { gt: entry.position },
        },
        data: { position: { decrement: 1 } },
      }),
    ])

    return reply.code(204).send()
  })
}

export default queueRoutes

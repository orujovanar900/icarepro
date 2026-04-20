import type { FastifyPluginAsync, FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { sendZodError } from '../utils/zodError.js'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

async function recalcUserRating(fastify: FastifyInstance, userId: string) {
  const agg = await fastify.prisma.review.aggregate({
    where: { subjectId: userId },
    _avg: { rating: true },
    _count: { _all: true },
  })
  const avg = agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null
  await fastify.prisma.user.update({
    where: { id: userId },
    data: {
      averageRating: avg,
      totalReviews: agg._count._all,
    },
  })
}

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /reviews/:userId — public list of reviews for a user
  fastify.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }

    const subject = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, averageRating: true, totalReviews: true },
    })
    if (!subject) return reply.code(404).send({ success: false, error: 'İstifadəçi tapılmadı' })

    const reviews = await fastify.prisma.review.findMany({
      where: { subjectId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return reply.send({ success: true, data: { subject, reviews } })
  })

  // POST /reviews/:userId — create or update the caller's review of :userId
  fastify.post('/:userId', { preHandler: [authenticate] }, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const authorId = req.user.sub

    if (authorId === userId) {
      return reply.code(400).send({ success: false, error: 'Öz hesabınıza rəy yaza bilməzsiniz' })
    }

    const subject = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!subject) return reply.code(404).send({ success: false, error: 'İstifadəçi tapılmadı' })

    const body = reviewSchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const review = await fastify.prisma.review.upsert({
      where: { authorId_subjectId: { authorId, subjectId: userId } },
      create: {
        authorId,
        subjectId: userId,
        rating: body.data.rating,
        comment: body.data.comment ?? null,
      },
      update: {
        rating: body.data.rating,
        comment: body.data.comment ?? null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    await recalcUserRating(fastify, userId)

    return reply.send({ success: true, data: review })
  })

  // DELETE /reviews/:userId — delete caller's own review of :userId
  fastify.delete('/:userId', { preHandler: [authenticate] }, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const authorId = req.user.sub

    const existing = await fastify.prisma.review.findUnique({
      where: { authorId_subjectId: { authorId, subjectId: userId } },
      select: { id: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Rəy tapılmadı' })

    await fastify.prisma.review.delete({ where: { id: existing.id } })
    await recalcUserRating(fastify, userId)

    return reply.code(204).send()
  })
}

export default reviewsRoutes

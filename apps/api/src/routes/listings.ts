import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  sendQueueConfirmation,
  sendListingApproved,
  sendListingRejected,
} from '../services/email.js'

// ─────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────

const createListingSchema = z.object({
  propertyId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['MENZIL', 'OFIS', 'OBYEKT', 'HEYET_EVI', 'GARAJ', 'TORPAQ', 'ANBAR']),
  district: z.string().optional(),
  address: z.string().min(1),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
  area: z.number().positive().optional(),
  rooms: z.number().int().optional(),
  basePrice: z.number().positive(),
  availStatus: z.enum(['BOSHDUR', 'BOSHALIR', 'INSAAT']).default('BOSHDUR'),
  contractStartDate: z.string().datetime().optional(),
  contractEndDate: z.string().datetime().optional(),
  expectedFreeDate: z.string().datetime().optional(),
  publisherType: z.enum(['SAHIBI', 'AGENT', 'AGENTLIK']).optional(),
  publisherName: z.string().optional(),
  isVip: z.boolean().default(false),
  isPushed: z.boolean().default(false),
  isPanorama: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const updateListingSchema = createListingSchema.partial()

const joinQueueSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  employStatus: z.string().optional(),
  persons: z.number().int().min(1).optional(),
  hasPets: z.boolean().default(false),
  isSmoker: z.boolean().default(false),
  companyName: z.string().optional(),
  voen: z.string().optional(),
  contactPerson: z.string().optional(),
  employeeCount: z.number().int().optional(),
  activityType: z.string().optional(),
  priceOffer: z.number().positive(),
  desiredMonths: z.number().int().optional(),
})

const reportSchema = z.object({
  reason: z.string().min(1),
  description: z.string().optional(),
})

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function computeHeatLevel(queueCount: number): string {
  if (queueCount <= 3) return 'AZ'
  if (queueCount <= 8) return 'ORTA'
  return 'YUKSEK'
}

function stripBasePrice<T extends { basePrice?: unknown }>(listing: T): Omit<T, 'basePrice'> {
  const { basePrice, ...rest } = listing as any
  void basePrice
  return rest
}

const KEY_FIELDS = ['title', 'address', 'basePrice', 'type', 'district', 'area', 'rooms', 'availStatus']
function isKeyFieldChanged(existing: any, incoming: any): boolean {
  return KEY_FIELDS.some(f => f in incoming && incoming[f] !== (existing as any)[f])
}

// ─────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────

const listingsRoutes: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SERVICE_KEY'] ?? '',
  )

  // ══════════════════════════════════════
  // PUBLIC ROUTES (no auth)
  // ══════════════════════════════════════

  // GET /listings
  fastify.get('/', async (req, reply) => {
    const q = req.query as Record<string, string>
    const page = Math.max(1, Number(q['page'] ?? 1))
    const limit = Math.min(50, Math.max(1, Number(q['limit'] ?? 20)))
    const offset = (page - 1) * limit

    const where: any = { status: 'ACTIVE', deletedAt: null }

    if (q['type']) where.type = q['type']
    if (q['district']) where.district = { contains: q['district'], mode: 'insensitive' }
    if (q['rooms']) where.rooms = Number(q['rooms'])
    if (q['availStatus']) where.availStatus = q['availStatus']
    if (q['areaMin'] || q['areaMax']) {
      where.area = {}
      if (q['areaMin']) where.area.gte = Number(q['areaMin'])
      if (q['areaMax']) where.area.lte = Number(q['areaMax'])
    }
    if (q['amenities']) {
      const amenityList = q['amenities'].split(',').map(a => a.trim()).filter(Boolean)
      if (amenityList.length) where.amenities = { hasEvery: amenityList }
    }
    if (q['search']) {
      where.OR = [
        { title: { contains: q['search'], mode: 'insensitive' } },
        { address: { contains: q['search'], mode: 'insensitive' } },
        { district: { contains: q['search'], mode: 'insensitive' } },
      ]
    }

    const [listings, total] = await Promise.all([
      fastify.prisma.listing.findMany({
        where,
        select: {
          id: true, title: true, type: true, district: true, address: true,
          floor: true, totalFloors: true, area: true, rooms: true,
          // basePrice intentionally omitted — private landlord floor price, never public
          availStatus: true, contractEndDate: true, expectedFreeDate: true,
          publisherType: true, publisherName: true,
          isVip: true, isPushed: true, isPanorama: true,
          amenities: true, photos: true, lat: true, lng: true,
          createdAt: true,
        },
        orderBy: [
          { isPanorama: 'desc' },
          { isVip: 'desc' },
          { isPushed: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      fastify.prisma.listing.count({ where }),
    ])

    // Batch queue stats
    const listingIds = listings.map(l => l.id)
    const [queueCounts, highestOffers] = await Promise.all([
      fastify.prisma.queueEntry.groupBy({
        by: ['listingId'],
        where: { listingId: { in: listingIds }, status: 'ACTIVE' },
        _count: { id: true },
      }),
      fastify.prisma.queueEntry.groupBy({
        by: ['listingId'],
        where: { listingId: { in: listingIds }, status: 'ACTIVE' },
        _max: { priceOffer: true },
      }),
    ])

    const countMap = new Map(queueCounts.map(r => [r.listingId, r._count.id]))
    const offerMap = new Map(highestOffers.map(r => [r.listingId, r._max.priceOffer]))

    const data = listings.map(l => ({
      ...l,
      queueCount: countMap.get(l.id) ?? 0,
      highestOffer: offerMap.get(l.id) ?? null,
      heatLevel: computeHeatLevel(countMap.get(l.id) ?? 0),
    }))

    return reply.send({ success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } })
  })

  // GET /listings/mine — must be BEFORE /:id to avoid conflict
  fastify.get('/mine', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const listings = await fastify.prisma.listing.findMany({
      where: { ...withOrg(req), deletedAt: null },
      select: {
        id: true, title: true, type: true, district: true, address: true,
        area: true, rooms: true, availStatus: true, status: true,
        basePrice: true, // owner can see their own floor price in /mine
        isVip: true, isPushed: true, isPanorama: true, photos: true,
        rejectionReason: true,
        createdAt: true, updatedAt: true,
        _count: { select: { queueEntries: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ success: true, data: listings })
  })

  // GET /listings/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const listing = await fastify.prisma.listing.findFirst({
      where: { id, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true, title: true, description: true, type: true, district: true,
        address: true, floor: true, totalFloors: true, area: true, rooms: true,
        availStatus: true, contractEndDate: true, expectedFreeDate: true,
        publisherType: true, publisherName: true,
        isVip: true, isPushed: true, isPanorama: true,
        amenities: true, photos: true, lat: true, lng: true, createdAt: true,
      },
    })

    if (!listing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const [queueCount, highestOfferAgg] = await Promise.all([
      fastify.prisma.queueEntry.count({ where: { listingId: id, status: 'ACTIVE' } }),
      fastify.prisma.queueEntry.aggregate({
        where: { listingId: id, status: 'ACTIVE' },
        _max: { priceOffer: true },
      }),
    ])

    return reply.send({
      success: true,
      data: {
        ...listing,
        queueCount,
        highestOffer: highestOfferAgg._max.priceOffer ?? null,
        heatLevel: computeHeatLevel(queueCount),
      },
    })
  })

  // GET /listings/:id/queue/summary
  fastify.get('/:id/queue/summary', async (req, reply) => {
    const { id } = req.params as { id: string }

    const exists = await fastify.prisma.listing.findFirst({
      where: { id, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    if (!exists) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const [queueCount, agg] = await Promise.all([
      fastify.prisma.queueEntry.count({ where: { listingId: id, status: 'ACTIVE' } }),
      fastify.prisma.queueEntry.aggregate({
        where: { listingId: id, status: 'ACTIVE' },
        _max: { priceOffer: true },
      }),
    ])

    return reply.send({
      success: true,
      data: {
        queueCount,
        highestOffer: agg._max.priceOffer ?? null,
        heatLevel: computeHeatLevel(queueCount),
      },
    })
  })

  // ══════════════════════════════════════
  // OPTIONAL AUTH — POST /:id/queue
  // ══════════════════════════════════════

  fastify.post('/:id/queue', async (req, reply) => {
    // Try JWT but don't fail if absent — anonymous queue joins are allowed
    try { await req.jwtVerify() } catch { /* anonymous allowed */ }

    // GAP 2 FIX: sanitize req.user — if token was present but malformed (missing sub
    // or organizationId), treat the request as anonymous rather than letting a partial
    // user object reach the ownership check below.
    const rawUser = req.user as any
    const authenticatedUser = (rawUser?.sub && rawUser?.organizationId)
      ? { sub: rawUser.sub as string, organizationId: rawUser.organizationId as string }
      : null

    const { id } = req.params as { id: string }
    const body = joinQueueSchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const listing = await fastify.prisma.listing.findFirst({
      where: { id, status: 'ACTIVE', deletedAt: null },
    })
    if (!listing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    // Price guard
    if (body.data.priceOffer < listing.basePrice) {
      return reply.code(400).send({ success: false, error: 'Təklifiniz minimum qiymətdən aşağıdır' })
    }

    const userId = authenticatedUser?.sub ?? null

    // GAP 1 FIX: ownership check runs whenever the user IS authenticated — a fully
    // anonymous request (no token at all) cannot be an org owner, so it passes through.
    // Previously this used (req.user as any).organizationId which could be undefined if
    // jwtVerify silently failed, causing the findFirst to match all listings with
    // organizationId = undefined (no match) — the check appeared to work but was unreliable.
    if (authenticatedUser) {
      if (listing.organizationId === authenticatedUser.organizationId) {
        return reply.code(400).send({ success: false, error: 'Öz elanınıza növbəyə düşə bilməzsiniz' })
      }
    }

    // Duplicate by email
    if (body.data.email) {
      const dup = await fastify.prisma.queueEntry.findFirst({
        where: { listingId: id, email: body.data.email, status: 'ACTIVE' },
        select: { id: true },
      })
      if (dup) return reply.code(400).send({ success: false, error: 'Bu elan üçün artıq növbədəsiniz' })
    }

    // Atomic position assignment
    const entry = await fastify.prisma.$transaction(async (tx) => {
      const agg = await tx.queueEntry.aggregate({
        where: { listingId: id, status: 'ACTIVE' },
        _max: { position: true },
      })
      const nextPosition = (agg._max.position ?? 0) + 1
      return tx.queueEntry.create({
        data: { listingId: id, userId, position: nextPosition, ...body.data },
      })
    })

    const queueCount = await fastify.prisma.queueEntry.count({
      where: { listingId: id, status: 'ACTIVE' },
    })

    if (body.data.email) {
      sendQueueConfirmation(body.data.email, {
        fullName: body.data.fullName,
        address: listing.address,
        position: entry.position,
        queueCount,
      }).catch(() => null)
    }

    return reply.code(201).send({ success: true, data: { position: entry.position, queueCount, entryId: entry.id } })
  })

  // ══════════════════════════════════════
  // AUTH REQUIRED
  // ══════════════════════════════════════

  // GET /listings/:id/queue/full
  fastify.get('/:id/queue/full', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const listing = await fastify.prisma.listing.findFirst({
      where: { id, status: { in: ['ACTIVE', 'CLOSING_PENDING'] }, deletedAt: null },
      // Explicitly exclude basePrice — tenants in the queue must not see the floor price
      select: { id: true },
    })
    if (!listing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const myEntry = await fastify.prisma.queueEntry.findFirst({
      where: { listingId: id, userId: req.user.sub, status: 'ACTIVE' },
    })
    if (!myEntry) return reply.code(403).send({ success: false, error: 'Növbədə deyilsiniz' })

    const allEntries = await fastify.prisma.queueEntry.findMany({
      where: { listingId: id, status: 'ACTIVE' },
      select: { id: true, position: true, priceOffer: true },
      orderBy: { position: 'asc' },
    })

    return reply.send({
      success: true,
      data: {
        // basePrice intentionally omitted — tenants must not see the landlord's floor price
        entries: allEntries,
        myEntry,
      },
    })
  })

  // POST /listings/:id/favorite — toggle
  fastify.post('/:id/favorite', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = req.user.sub

    const existing = await fastify.prisma.listingFavorite.findFirst({
      where: { listingId: id, userId },
    })

    if (existing) {
      await fastify.prisma.listingFavorite.delete({ where: { id: existing.id } })
      return reply.send({ success: true, data: { isFavorited: false } })
    }

    await fastify.prisma.listingFavorite.create({ data: { listingId: id, userId } })
    return reply.send({ success: true, data: { isFavorited: true } })
  })

  // POST /listings/:id/report
  fastify.post('/:id/report', async (req, reply) => {
    // Optional auth
    try { await req.jwtVerify() } catch { /* anonymous allowed */ }

    const { id } = req.params as { id: string }
    const body = reportSchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const exists = await fastify.prisma.listing.findFirst({
      where: { id, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    if (!exists) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const reporterId = (req.user as any)?.sub ?? null

    await fastify.prisma.listingReport.create({
      data: { listingId: id, reporterId, ...body.data },
    })

    return reply.send({ success: true })
  })

  // ══════════════════════════════════════
  // OWNER / AGENT / AGENTLIK
  // ══════════════════════════════════════

  // POST /listings — create
  fastify.post('/', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const body = createListingSchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const publisherType = body.data.publisherType ?? (
      req.user.role === 'AGENTLIK' ? 'AGENTLIK' :
      req.user.role === 'AGENT' ? 'AGENT' : 'SAHIBI'
    )
    const publisherName = body.data.publisherName ?? req.user.name

    const listing = await fastify.prisma.listing.create({
      data: {
        ...body.data,
        organizationId: req.user.organizationId,
        status: 'DRAFT',
        publisherType,
        publisherName,
      },
    })

    return reply.code(201).send({ success: true, data: stripBasePrice(listing) })
  })

  // PUT /listings/:id — update
  fastify.put('/:id', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateListingSchema.safeParse(req.body)
    if (!body.success) return sendZodError(reply, body.error)

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const resetToModeration = isKeyFieldChanged(existing, body.data)
    const updateData: any = {
      ...body.data,
      ...(resetToModeration ? { status: 'PENDING', moderatedAt: null, moderatedBy: null, rejectionReason: null } : {}),
    }

    const listing = await fastify.prisma.listing.update({ where: { id }, data: updateData })
    return reply.send({ success: true, data: stripBasePrice(listing) })
  })

  // DELETE /listings/:id — soft delete
  fastify.delete('/:id', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    await fastify.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } })
    return reply.code(204).send()
  })

  // GET /listings/:id/leads — full queue for owner
  fastify.get('/:id/leads', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const listing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
    })
    if (!listing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const entries = await fastify.prisma.queueEntry.findMany({
      where: { listingId: id, status: 'ACTIVE' },
      orderBy: { position: 'asc' },
    })

    return reply.send({ success: true, data: entries })
  })

  // POST /listings/:id/publish — DRAFT → PENDING (submit for moderation)
  fastify.post('/:id/publish', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
      select: { id: true, status: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
    if (existing.status !== 'DRAFT') {
      return reply.code(400).send({ success: false, error: 'Yalnız qaralama elanlar dərc edilə bilər' })
    }

    const listing = await fastify.prisma.listing.update({
      where: { id },
      data: { status: 'PENDING' },
    })

    await writeAuditLog(fastify.prisma, {
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'LISTING_PUBLISHED',
      entityType: 'Listing',
      entityId: id,
    })

    return reply.send({ success: true, data: stripBasePrice(listing) })
  })

  // POST /listings/:id/select-winner — ACTIVE → CLOSING_PENDING, mark entry SELECTED
  fastify.post('/:id/select-winner', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { entryId } = req.body as { entryId: string }

    if (!entryId) return reply.code(400).send({ success: false, error: 'entryId is required' })

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
      select: { id: true, status: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
    if (existing.status !== 'ACTIVE') {
      return reply.code(400).send({ success: false, error: 'Yalnız aktiv elanlar üçün icarəçi seçilə bilər' })
    }

    const entry = await fastify.prisma.queueEntry.findFirst({
      where: { id: entryId, listingId: id, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!entry) return reply.code(404).send({ success: false, error: 'Növbə qeydi tapılmadı' })

    const [updatedListing] = await fastify.prisma.$transaction([
      fastify.prisma.listing.update({
        where: { id },
        data: { status: 'CLOSING_PENDING' },
      }),
      fastify.prisma.queueEntry.update({
        where: { id: entryId },
        data: { status: 'SELECTED' },
      }),
    ])

    await writeAuditLog(fastify.prisma, {
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'LISTING_WINNER_SELECTED',
      entityType: 'Listing',
      entityId: id,
      metadata: { selectedEntryId: entryId },
    })

    return reply.send({ success: true, data: stripBasePrice(updatedListing) })
  })

  // PATCH /listings/:id/confirm-deal — CLOSING_PENDING → ARCHIVED
  fastify.patch('/:id/confirm-deal', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
      select: { id: true, status: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
    if (existing.status !== 'CLOSING_PENDING') {
      return reply.code(400).send({ success: false, error: 'Yalnız CLOSING_PENDING elanlar təsdiqlənə bilər' })
    }

    const listing = await fastify.prisma.listing.update({
      where: { id },
      data: { status: 'DEACTIVATED', closedById: req.user.sub },
    })

    await writeAuditLog(fastify.prisma, {
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'LISTING_DEAL_CONFIRMED',
      entityType: 'Listing',
      entityId: id,
    })

    return reply.send({ success: true, data: stripBasePrice(listing) })
  })

  // PATCH /listings/:id/cancel-deal — CLOSING_PENDING → ACTIVE (preserve queue)
  fastify.patch('/:id/cancel-deal', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
      select: { id: true, status: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })
    if (existing.status !== 'CLOSING_PENDING') {
      return reply.code(400).send({ success: false, error: 'Yalnız CLOSING_PENDING elanlar üçün ləğv edilə bilər' })
    }

    // Restore SELECTED entry back to ACTIVE so queue is preserved
    await fastify.prisma.queueEntry.updateMany({
      where: { listingId: id, status: 'SELECTED' },
      data: { status: 'ACTIVE' },
    })

    const listing = await fastify.prisma.listing.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })

    await writeAuditLog(fastify.prisma, {
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'LISTING_DEAL_CANCELLED',
      entityType: 'Listing',
      entityId: id,
    })

    return reply.send({
      success: true,
      listing: stripBasePrice(listing),
      requiresOwnerInput: true,
      message: 'Sahibdən aşağıdakı məlumatlar tələb olunur',
    })
  })

  // PATCH /listings/:id/availability — update availStatus + expectedFreeDate
  fastify.patch('/:id/availability', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { availStatus, expectedFreeDate } = req.body as { availStatus?: string; expectedFreeDate?: string }

    const validAvailStatuses = ['BOSHDUR', 'BOSHALIR', 'INSAAT']
    if (availStatus && !validAvailStatuses.includes(availStatus)) {
      return reply.code(400).send({ success: false, error: 'Etibarsız mövcudluq statusu' })
    }

    const existing = await fastify.prisma.listing.findFirst({
      where: { id, ...withOrg(req), deletedAt: null },
      select: { id: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Elan tapılmadı' })

    const updateData: Record<string, unknown> = {}
    if (availStatus) updateData['availStatus'] = availStatus
    if (expectedFreeDate) updateData['expectedFreeDate'] = new Date(expectedFreeDate)
    else if (availStatus === 'BOSHDUR') updateData['expectedFreeDate'] = null

    const listing = await fastify.prisma.listing.update({
      where: { id },
      data: updateData,
    })

    return reply.send({ success: true, data: stripBasePrice(listing) })
  })

  // POST /listings/upload-photo — multipart to Supabase
  fastify.post('/upload-photo', {
    preHandler: [authenticate, requireRole(['OWNER', 'AGENT', 'AGENTLIK'])],
  }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ success: false, error: 'Fayl tapılmadı' })

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(data.mimetype)) {
      return reply.code(400).send({ success: false, error: 'Yalnız JPG, PNG, WEBP yükləyə bilərsiniz' })
    }

    const fileBuffer = await data.toBuffer()
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return reply.code(400).send({ success: false, error: 'Maksimum fayl ölçüsü 10MB-dır' })
    }

    const fields = data.fields as Record<string, any>
    // Sanitize to alphanumeric + hyphens only to prevent path traversal in Supabase storage
    const rawListingId = String(fields['listingId']?.value ?? 'temp')
    const listingId = rawListingId.replace(/[^a-zA-Z0-9-]/g, '') || 'temp'
    const ext = (data.filename.split('.').pop() ?? 'jpg').replace(/[^a-zA-Z0-9]/g, '')
    const path = `${listingId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(path, fileBuffer, { contentType: data.mimetype, upsert: false })

    if (error) {
      fastify.log.error(error)
      return reply.code(500).send({ success: false, error: 'Yükləmə xətası' })
    }

    const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
    return reply.code(201).send({ success: true, data: { url: publicUrl } })
  })
}

export default listingsRoutes

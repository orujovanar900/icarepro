import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'

const createSchema = z.object({
    number: z.string().min(1),
    name: z.string().min(1),
    building: z.string().min(1),
    address: z.string().min(1),
    area: z.number().positive(),
    type: z.string().optional(),
    status: z.enum(['VACANT', 'OCCUPIED', 'UNDER_REPAIR']).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
})

const updateSchema = createSchema.partial()

const propertiesRoutes: FastifyPluginAsync = async (fastify) => {
    const supabase = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_SERVICE_KEY'] ?? '',
    )

    // GET /properties
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = req.query as Record<string, string>
        const search = q['search']
        const limit = Number(q['limit'] ?? 50)
        const offset = Number(q['offset'] ?? 0)
        const typeFilter = q['type']

        const deleted = q['deleted'] === 'true'

        const where = {
            ...withOrg(req),
            deletedAt: deleted ? { not: null } : null,
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { number: { contains: search } },
                    { address: { contains: search, mode: 'insensitive' } },
                ]
            } : {}),
            ...(typeFilter ? { type: typeFilter } : {}),
        }

        let orderByCol = 'number'

        const [properties, total] = await Promise.all([
            fastify.prisma.property.findMany({
                where: where as any,
                include: {
                    photos: { orderBy: { sortOrder: 'asc' } },
                    meterReadings: { take: 1, orderBy: { readingDate: 'desc' } },
                    _count: { select: { contracts: { where: { status: 'ACTIVE' } } } },
                    contracts: { where: { status: 'ACTIVE' }, take: 1, include: { tenant: { select: { firstName: true, lastName: true, companyName: true } } } }
                },
                orderBy: q['sort'] === 'rent_desc' ? { contracts: { _count: 'desc' } } : q['sort'] === 'rent_asc' ? { contracts: { _count: 'asc' } } : q['sort'] === 'area_desc' ? { area: 'desc' } : q['sort'] === 'area_asc' ? { area: 'asc' } : { number: 'asc' },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.property.count({ where: where as any })
        ])

        // Dynamically compute 'OCCUPIED' if there's an active contract and not under repair
        const mappedProperties = properties.map(p => ({
            ...p,
            status: p.status !== 'UNDER_REPAIR' && p._count.contracts > 0 ? 'OCCUPIED' : p.status
        }))

        return reply.send({ success: true, data: mappedProperties, meta: { total } })
    })

    // GET /properties/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const property = await fastify.prisma.property.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                photos: { orderBy: { sortOrder: 'asc' } },
                meterReadings: { orderBy: { readingDate: 'desc' }, take: 12 },
                contracts: {
                    include: { tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true, phone: true } } },
                    orderBy: { startDate: 'desc' },
                },
            },
        })
        if (!property) return reply.code(404).send({ success: false, error: 'Property not found' })

        // Map tenant name for each contract
        const propertyMapped = {
            ...property,
            contracts: property.contracts.map(c => ({
                ...c,
                tenant: {
                    ...c.tenant,
                    fullName: c.tenant.tenantType === 'fiziki' ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim() : c.tenant.companyName || '',
                }
            }))
        }

        // Apply status logic to the mapped property
        if (propertyMapped.status !== 'UNDER_REPAIR' && propertyMapped.contracts.some((c: any) => c.status === 'ACTIVE')) {
            propertyMapped.status = 'OCCUPIED'
        }

        return reply.send({ success: true, data: propertyMapped })
    })

    // GET /properties/:id/report — For Property Detail 'Əmlak Hesabatı' tab
    fastify.get('/:id/report', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        // Fetch all contracts for this property
        const contracts = await fastify.prisma.contract.findMany({
            where: { propertyId: id, deletedAt: null },
            include: { payments: { where: { deletedAt: null } } }
        })

        let totalIncome = 0;
        let totalExpectedRent = 0;

        // Calculate total income and expected rent
        for (const c of contracts) {
            // Income for this contract
            const cIncome = c.payments.reduce((acc, p) => acc + Number(p.amount), 0);
            totalIncome += cIncome;

            // Simple Expected rent for this contract based on months passed
            const start = new Date(c.startDate);
            const end = c.endDate ? new Date(c.endDate) : new Date();
            const now = new Date();
            const effectiveEnd = end > now ? now : end;

            // basic month diff
            let monthsPassed = (effectiveEnd.getFullYear() - start.getFullYear()) * 12 + (effectiveEnd.getMonth() - start.getMonth());
            if (monthsPassed < 0) monthsPassed = 0;
            if (monthsPassed === 0 && effectiveEnd >= start) monthsPassed = 1; // at least 1 month if started

            const cExpected = monthsPassed * Number(c.monthlyRent);
            totalExpectedRent += cExpected;
        }

        let totalDebt = totalExpectedRent - totalIncome;
        if (totalDebt < 0) totalDebt = 0;

        const efficiency = (totalIncome + totalDebt) > 0 ? Math.round((totalIncome / (totalIncome + totalDebt)) * 100) : 0;

        // Ay-ba-ay Gəlir (Last 12 months)
        const monthlyStats = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('az-AZ', { month: 'short', year: '2-digit' });

            // Income for this month
            let monthIncome = 0;
            let monthExpected = 0;

            for (const c of contracts) {
                // Sum payments in this month
                const paymentsThisMonth = c.payments.filter(p => {
                    const pd = new Date(p.paymentDate);
                    return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
                });
                monthIncome += paymentsThisMonth.reduce((acc, p) => acc + Number(p.amount), 0);

                // Expected rent (if contract was active in this month)
                const start = new Date(c.startDate);
                const end = new Date(c.endDate);
                if (start <= new Date(d.getFullYear(), d.getMonth() + 1, 0) && end >= d) {
                    monthExpected += Number(c.monthlyRent);
                }
            }

            let monthDebt = monthExpected - monthIncome;
            if (monthDebt < 0) monthDebt = 0;

            monthlyStats.push({
                name: monthLabel,
                gelir: monthIncome,
                borc: monthDebt
            });
        }

        return reply.send({
            success: true,
            data: {
                totalIncome,
                totalDebt,
                efficiency,
                monthlyStats
            }
        });
    })

    // GET /properties/:id/tenants
    fastify.get('/:id/tenants', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        const contracts = await fastify.prisma.contract.findMany({
            where: { propertyId: id, ...withOrg(req) },
            include: { tenant: true },
            orderBy: { startDate: 'desc' }
        })
        return reply.send({ success: true, data: contracts })
    })

    // POST /properties
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const property = await fastify.prisma.property.create({ data: { ...body.data, organizationId: req.user.organizationId } })
        return reply.code(201).send({ success: true, data: property })
    })

    // PATCH /properties/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })
        const property = await fastify.prisma.property.update({ where: { id }, data: body.data as never })
        return reply.send({ success: true, data: property })
    })

    // DELETE /properties/:id — soft delete
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })
        await fastify.prisma.property.update({ where: { id }, data: { deletedAt: new Date() } })
        return reply.code(204).send()
    })

    // PATCH /properties/:id/restore
    fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        await fastify.prisma.property.update({
            where: { id },
            data: { deletedAt: null }
        })
        return reply.send({ success: true })
    })

    // POST /properties/:id/photos — multipart upload → Supabase Storage
    fastify.post('/:id/photos', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        if (!data.mimetype.startsWith('image/')) {
            return reply.code(400).send({ success: false, error: 'Yalnız şəkil yükləyə bilərsiniz' })
        }

        const fileBuffer = await data.toBuffer()
        if (fileBuffer.length > 4 * 1024 * 1024) {
            return reply.code(400).send({ success: false, error: 'Maksimum fayl ölçüsü 4MB olmalıdır' })
        }

        const ext = data.filename.split('.').pop() ?? 'jpg'
        const path = `${req.user.organizationId}/${id}/${Date.now()}.${ext}`

        const { error } = await supabase.storage
            .from('property-photos')
            .upload(path, fileBuffer, { contentType: data.mimetype, upsert: false })

        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path)

        const caption = (req.query as Record<string, string>)['caption']
        const photo = await fastify.prisma.propertyPhoto.create({
            data: { propertyId: id, url: publicUrl, caption: caption ?? null },
        })

        return reply.code(201).send({ success: true, data: photo })
    })



    // DELETE /properties/:id/photos/:photoId
    fastify.delete('/:id/photos/:photoId', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id, photoId } = req.params as { id: string, photoId: string }

        await fastify.prisma.propertyPhoto.delete({
            where: { id: photoId, propertyId: id, property: { ...withOrg(req) } }
        }).catch(() => null)

        return reply.code(204).send()
    })

    // POST /properties/:id/documents — upload "Digər sənədlər" to Supabase
    fastify.post('/:id/documents', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.property.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Property not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
        if (!allowed.includes(data.mimetype)) {
            return reply.code(400).send({ success: false, error: 'Yalnız PDF, DOC, DOCX, JPG, PNG yükləyə bilərsiniz' })
        }

        const fileBuffer = await data.toBuffer()
        if (fileBuffer.length > 4 * 1024 * 1024) {
            return reply.code(400).send({ success: false, error: 'Maksimum fayl ölçüsü 4MB olmalıdır' })
        }

        const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${req.user.organizationId}/${id}/other/${Date.now()}_${safeName}`

        const { error } = await supabase.storage
            .from('property-documents')
            .upload(path, fileBuffer, { contentType: data.mimetype, upsert: false })

        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('property-documents').getPublicUrl(path)

        // Store as a JSON note on the property (use misc field or separate table)
        // We'll use PropertyPhoto table with a special caption prefix for now
        const doc = await fastify.prisma.propertyPhoto.create({
            data: { propertyId: id, url: publicUrl, caption: `DOC::${data.filename}` },
        })

        return reply.code(201).send({ success: true, data: { id: doc.id, url: publicUrl, name: data.filename } })
    })

    // DELETE /properties/:id/documents/:docId
    fastify.delete('/:id/documents/:docId', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id, docId } = req.params as { id: string, docId: string }
        await fastify.prisma.propertyPhoto.delete({
            where: { id: docId, propertyId: id, property: { ...withOrg(req) } }
        }).catch(() => null)
        return reply.code(204).send()
    })
}

export default propertiesRoutes


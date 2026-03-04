import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { sendZodError } from '../utils/zodError.js'
import { withOrg } from '../utils/withOrg.js'
import { writeAuditLog } from '../utils/audit.js'
import { calculateContractDebtAndExpected, getNextPaymentDate, getDueDateForPaymentIndex } from '../utils/contractUtils.js'

// Inline tenant creation schema (mirrors the full tenant schemas)
const newTenantSchema = z.union([
    z.object({
        tenantType: z.literal('fiziki'),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        fatherName: z.string().optional(),
        fin: z.string().optional(),
        passportSeries: z.string().optional(),
        passportIssuedBy: z.string().optional(),
        passportIssuedAt: z.string().optional(),
        birthDate: z.string().optional(),
        phone: z.string().optional(),
        phone2: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        notes: z.string().optional(),
    }),
    z.object({
        tenantType: z.literal('huquqi'),
        companyName: z.string().min(1),
        voen: z.string().optional(),
        directorName: z.string().optional(),
        companyAddress: z.string().optional(),
        bankName: z.string().optional(),
        bankCode: z.string().optional(),
        iban: z.string().optional(),
        phone: z.string().optional(),
        phone2: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        notes: z.string().optional(),
    }),
])

const createSchema = z.object({
    number: z.string().min(1),
    propertyId: z.string().min(1),
    tenantId: z.string().optional(), // optional if newTenant is provided
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']),
    monthlyRent: z.number().positive(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    taxRate: z.number().min(0).max(100).optional(),
    depositAmount: z.number().min(0).optional(),
    isDepositReturned: z.boolean().optional(),
    baseRent: z.number().min(0).optional(),
    revenuePercent: z.number().min(0).max(100).optional(),
    dailyRate: z.number().min(0).optional(),
    parentContractId: z.string().optional(),
    notes: z.string().optional(),
    paymentMode: z.enum(['CALENDAR', 'FIXED_DAY']).optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    // Inline tenant creation
    newTenant: newTenantSchema.optional(),
    // When existing tenant's data was changed in contract form
    updateTenant: z.boolean().optional(),
})

const updateSchema = createSchema.partial()


const listQuerySchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    rentalType: z.enum(['RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE']).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sortBy: z.enum(['startDate', 'endDate', 'monthlyRent', 'number']).default('startDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    deleted: z.enum(['true', 'false']).optional(),
})

const contractsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /contracts
    fastify.get('/', { preHandler: [authenticate] }, async (req, reply) => {
        const q = listQuerySchema.safeParse(req.query)
        if (!q.success) return sendZodError(reply, q.error)

        const { status, rentalType, search, limit, offset, sortBy, sortOrder, deleted } = q.data
        const org = withOrg(req)
        const isDeleted = deleted === 'true'

        const where: any = {
            ...org,
            deletedAt: isDeleted ? { not: null } : null,
            ...(status ? { status } : {}),
            ...(rentalType ? { rentalType } : {}),
            ...(search ? {
                OR: [
                    { number: { contains: search, mode: 'insensitive' as const } },
                    {
                        tenant: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' as const } },
                                { lastName: { contains: search, mode: 'insensitive' as const } },
                                { companyName: { contains: search, mode: 'insensitive' as const } },
                            ]
                        }
                    },
                    { property: { name: { contains: search, mode: 'insensitive' as const } } },
                ],
            } : {}),
        }

        const [contracts, total] = await Promise.all([
            fastify.prisma.contract.findMany({
                where,
                include: {
                    property: { select: { id: true, number: true, name: true, address: true } },
                    tenant: { select: { id: true, tenantType: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
                    _count: { select: { payments: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: offset,
            }),
            fastify.prisma.contract.count({ where }),
        ])

        const contractIds = contracts.map(c => c.id);

        const paymentsAgg = await fastify.prisma.payment.groupBy({
            by: ['contractId'],
            where: { contractId: { in: contractIds } },
            _sum: { amount: true }
        });

        const paidMap = new Map<string, number>();
        paymentsAgg.forEach(agg => {
            paidMap.set(agg.contractId, Number(agg._sum.amount ?? 0));
        });

        // Calculate computed debt, expectedPaymentDate, and daysOverdue
        const contractsWithDebt = contracts.map((c: any) => {
            const tenantFullName = c.tenant.tenantType === 'fiziki'
                ? `${c.tenant.firstName || ''} ${c.tenant.lastName || ''}`.trim()
                : c.tenant.companyName || ''

            const tenantWithFullName = { ...c.tenant, fullName: tenantFullName }

            if (c.status !== 'ACTIVE') return {
                ...c,
                tenant: tenantWithFullName,
                debt: 0,
                daysOverdue: 0
            }

            const totalPaid = paidMap.get(c.id) || 0;

            const now = new Date()
            const totalExpected = calculateContractDebtAndExpected(c, now)
            const debt = Math.max(0, totalExpected - totalPaid)

            let daysOverdue = 0
            if (debt > 0) {
                const monthsPaidFully = Math.floor(totalPaid / Number(c.monthlyRent))
                const expectedDate = getDueDateForPaymentIndex(c, monthsPaidFully)

                if (expectedDate < now) {
                    const diffTime = Math.abs(now.getTime() - expectedDate.getTime())
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                }
            }

            return {
                ...c,
                tenant: tenantWithFullName,
                debt,
                daysOverdue
            }
        })

        return reply.send({
            success: true,
            data: contractsWithDebt,
            meta: { total, limit, offset },
        })
    })

    // GET /contracts/:id
    fastify.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({
            where: { id, ...withOrg(req) },
            include: {
                property: true,
                tenant: true,
                payments: { orderBy: { paymentDate: 'desc' } },
            },
        })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })
        return reply.send({ success: true, data: contract })
    })

    // POST /contracts
    fastify.post('/', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const body = createSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        const { startDate, endDate, monthlyRent, newTenant, updateTenant, ...rest } = body.data

        // Resolve tenantId: either existing or create a new tenant inline
        let tenantId = rest.tenantId
        if (!tenantId && !newTenant) {
            return reply.code(400).send({ success: false, error: 'Either tenantId or newTenant must be provided' })
        }
        if (newTenant) {
            const createdTenant = await fastify.prisma.tenant.create({
                data: { ...newTenant, ...withOrg(req) } as never,
            })
            tenantId = createdTenant.id
        }

        const contract = await fastify.prisma.contract.create({
            data: {
                ...rest,
                tenantId: tenantId!,
                ...withOrg(req),
                monthlyRent,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            } as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'CREATE_CONTRACT',
            entityType: 'Contract',
            entityId: contract.id,
        })

        return reply.code(201).send({ success: true, data: contract })
    })

    // PATCH /contracts/:id
    fastify.patch('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = updateSchema.safeParse(req.body)
        if (!body.success) return sendZodError(reply, body.error)

        // Получаем старые значения для AuditLog
        const old = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!old) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const { startDate, endDate, monthlyRent, ...rest } = body.data
        const data: Record<string, unknown> = { ...rest }
        if (monthlyRent !== undefined) data['monthlyRent'] = monthlyRent
        if (startDate !== undefined) data['startDate'] = new Date(startDate)
        if (endDate !== undefined) data['endDate'] = new Date(endDate)

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: data as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'UPDATE_CONTRACT',
            entityType: 'Contract',
            entityId: contract.id,
            metadata: { oldValue: old, newValue: body.data },
        })

        return reply.send({ success: true, data: contract })
    })

    // PATCH /contracts/:id/archive
    fastify.patch('/:id/archive', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'ARCHIVE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.send({ success: true, data: contract })
    })

    // GET /contracts/:id/audit-logs
    fastify.get('/:id/audit-logs', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const logs = await fastify.prisma.auditLog.findMany({
            where: { entityType: 'Contract', entityId: id },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        return reply.send({ success: true, data: logs })
    })

    // POST /contracts/:id/renew — extend end date
    fastify.post('/:id/renew', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const body = req.body as { newEndDate: string; newMonthlyRent?: number; note?: string }

        if (!body.newEndDate) return reply.code(400).send({ success: false, error: 'newEndDate is required' })

        const old = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!old) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const updateData: Record<string, unknown> = {
            endDate: new Date(body.newEndDate),
            status: 'ACTIVE',
        }
        if (body.newMonthlyRent !== undefined) updateData['monthlyRent'] = body.newMonthlyRent

        const contract = await fastify.prisma.contract.update({
            where: { id },
            data: updateData as never,
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'RENEW_CONTRACT',
            entityType: 'Contract',
            entityId: id,
            metadata: {
                oldEndDate: old.endDate,
                newEndDate: body.newEndDate,
                note: body.note ?? null,
            },
        })

        return reply.send({ success: true, data: contract })
    })

    // DELETE /contracts/:id
    fastify.delete('/:id', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        await fastify.prisma.contract.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'DELETE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.code(204).send()
    })

    // PATCH /contracts/:id/restore
    fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const exists = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!exists) return reply.code(404).send({ success: false, error: 'Contract not found' })

        await fastify.prisma.contract.update({
            where: { id },
            data: { deletedAt: null }
        })

        await writeAuditLog(fastify.prisma, {
            organizationId: req.user.organizationId,
            userId: req.user.sub,
            action: 'RESTORE_CONTRACT',
            entityType: 'Contract',
            entityId: id,
        })

        return reply.send({ success: true })
    })

    // ── Contract Documents ──────────────────────────────────────────
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
        process.env['SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_KEY']!
    )

    // GET /contracts/:id/documents
    fastify.get('/:id/documents', { preHandler: [authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const docs = await fastify.prisma.contractDocument.findMany({
            where: { contractId: id, deletedAt: null },
            orderBy: { uploadedAt: 'desc' },
        })
        return reply.send({ success: true, data: docs })
    })

    // POST /contracts/:id/documents
    fastify.post('/:id/documents', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id } = req.params as { id: string }
        const contract = await fastify.prisma.contract.findFirst({ where: { id, ...withOrg(req) } })
        if (!contract) return reply.code(404).send({ success: false, error: 'Contract not found' })

        const data = await req.file()
        if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded' })

        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
        ]
        if (!allowedMimes.includes(data.mimetype)) {
            return reply.code(400).send({ success: false, error: 'Yalniz PDF, DOC, DOCX, XLSX, JPG, PNG yukleye bilersiniz' })
        }

        const fileBuffer = await data.toBuffer()
        if (fileBuffer.length > 5 * 1024 * 1024) {
            return reply.code(400).send({ success: false, error: 'Maximum fayl olcusu 5MB olmalidir' })
        }

        const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${id}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('contract-documents')
            .upload(storagePath, fileBuffer, { contentType: data.mimetype, upsert: false })

        if (uploadError) {
            fastify.log.error(uploadError)
            return reply.code(500).send({ success: false, error: 'Upload failed' })
        }

        const { data: { publicUrl } } = supabase.storage.from('contract-documents').getPublicUrl(storagePath)

        const fields = data.fields as Record<string, any>
        const docType = fields['type']?.value || 'OTHER'
        const rawTitle = fields['title']?.value || ''
        const docTitle = rawTitle || `${docTypeLabel(docType)} - ${new Date().toLocaleDateString('az-AZ')}`
        const docNotes = fields['notes']?.value || null

        const doc = await fastify.prisma.contractDocument.create({
            data: {
                contractId: id,
                type: docType,
                title: docTitle,
                fileUrl: publicUrl,
                fileName: data.filename,
                fileSize: fileBuffer.length,
                uploadedBy: req.user.sub,
                notes: docNotes,
            },
        })

        return reply.code(201).send({ success: true, data: doc })
    })

    // PATCH /contracts/:id/documents/:docId
    fastify.patch('/:id/documents/:docId', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id, docId } = req.params as { id: string; docId: string }
        const body = req.body as { title?: string; notes?: string }

        const doc = await fastify.prisma.contractDocument.findFirst({
            where: { id: docId, contractId: id, deletedAt: null }
        })
        if (!doc) return reply.code(404).send({ success: false, error: 'Document not found' })

        const updated = await fastify.prisma.contractDocument.update({
            where: { id: docId },
            data: {
                title: body.title ?? doc.title,
                notes: body.notes ?? doc.notes,
            },
        })
        return reply.send({ success: true, data: updated })
    })

    // DELETE /contracts/:id/documents/:docId (soft delete)
    fastify.delete('/:id/documents/:docId', {
        preHandler: [authenticate, requireRole(['OWNER', 'MANAGER', 'ADMINISTRATOR'])]
    }, async (req, reply) => {
        const { id, docId } = req.params as { id: string; docId: string }
        await fastify.prisma.contractDocument.updateMany({
            where: { id: docId, contractId: id },
            data: { deletedAt: new Date() },
        })
        return reply.code(204).send()
    })
    // ─────────────────────────────────────────
    // POST /contracts/senad-ustasi/usage - Increment AI generation counter
    // ─────────────────────────────────────────
    fastify.post('/senad-ustasi/usage', { preHandler: [authenticate] }, async (req, reply) => {
        const orgId = req.user.organizationId;
        if (!orgId) return reply.code(403).send({ success: false, error: 'No organization attached' });

        const org = await fastify.prisma.organization.findUnique({
            where: { id: orgId },
            select: { senadUstasiUsedMonth: true, senadUstasiResetDate: true, plan: true }
        });

        if (!org) return reply.code(404).send({ success: false, error: 'Organization not found' });

        const now = new Date();
        const resetDate = org.senadUstasiResetDate ? new Date(org.senadUstasiResetDate) : new Date(now.getFullYear(), now.getMonth(), 1);

        let usedCount = org.senadUstasiUsedMonth || 0;
        let newResetDate = org.senadUstasiResetDate;

        // Reset if a new month has started since the last reset date
        if (!org.senadUstasiResetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            usedCount = 0;
            // Set reset date to the first day of the current month
            newResetDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const L: Record<string, { senadUstasi: boolean, senadLimit: number | null }> = {
            FREE: { senadUstasi: false, senadLimit: 0 },
            BASHLANQIC: { senadUstasi: false, senadLimit: 0 },
            PROFESSIONAL: { senadUstasi: true, senadLimit: 30 },
            BIZNES: { senadUstasi: true, senadLimit: null }
        };
        const planLimits = L[org.plan] || { senadUstasi: false, senadLimit: 0 };

        if (!planLimits.senadUstasi || (planLimits.senadLimit !== null && usedCount >= planLimits.senadLimit)) {
            return reply.code(403).send({ success: false, error: 'Plan limit reached for Sənəd Ustası' });
        }

        const updatedOrg = await fastify.prisma.organization.update({
            where: { id: orgId },
            data: {
                senadUstasiUsedMonth: usedCount + 1,
                senadUstasiResetDate: newResetDate
            },
            select: { senadUstasiUsedMonth: true, senadUstasiResetDate: true }
        });

        return reply.send({ success: true, data: updatedOrg });
    });
}

function docTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        ACT: 'Akt',
        NOTIFICATION: 'Bildiri\u015f',
        ADDENDUM: '\u018flav\u0259',
        INVOICE: 'Hesab-faktura',
        OTHER: 'S\u0259n\u0259d',
    }
    return labels[type] || 'S\u0259n\u0259d'
}

export default contractsRoutes

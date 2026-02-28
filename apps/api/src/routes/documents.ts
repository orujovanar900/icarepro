import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import * as pdfParseModule from 'pdf-parse'
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

// Use explicit Type string matching the prisma DocumentType Enum
type DocumentTypeRaw = 'CONTRACT' | 'ACT' | 'DEBT_NOTICE' | 'INVOICE' | 'RECEIPT' | 'ADDENDUM' | 'TERMINATION' | 'PHOTO_REPORT';

import { requireRole } from '../middleware/requireRole.js'

export default async function documentsRoutes(app: FastifyInstance) {
    // Requires authentication for all document routes
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch (err) {
            return reply.code(401).send({ success: false, error: 'Unauthorized' })
        }
    })

    // ── 1. GET /documents?contractId=xxx ────────────────────────
    app.get<{
        Querystring: {
            contractId?: string
            type?: string
            limit?: number
            offset?: number
        }
    }>('/', async (request, reply) => {
        const user = request.user as unknown as { id: string; organizationId: string; role: string }
        const { contractId, type, limit = 50, offset = 0 } = request.query

        try {
            const whereClause: Prisma.DocumentWhereInput = {
                organizationId: user.organizationId
            }

            if (contractId) {
                // Verify user has access to this contract or if they just belong to the organization
                whereClause.contractId = contractId
            }

            if (type) {
                whereClause.type = type as DocumentTypeRaw
            }

            const docs = await app.prisma.document.findMany({
                where: whereClause,
                orderBy: { generatedAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
                include: {
                    contract: {
                        select: {
                            id: true,
                            number: true,
                            tenantId: true,
                            tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true } }
                        }
                    }
                }
            })

            let contractInfo = null
            if (contractId) {
                contractInfo = await app.prisma.contract.findUnique({
                    where: { id: contractId, organizationId: user.organizationId },
                    include: {
                        tenant: { select: { tenantType: true, firstName: true, lastName: true, companyName: true } },
                        property: { select: { name: true } }
                    }
                })
            }

            return reply.send({
                success: true,
                data: docs,
                contractInfo
            })
        } catch (error: any) {
            app.log.error(error)
            return reply.code(500).send({ success: false, error: error.message })
        }
    })

    // ── 2. POST /documents/save ─────────────────────────────────
    app.post<{
        Body: {
            contractId: string
            title: string
            type: string
            content: string
        }
    }>('/save', { preHandler: [requireRole(['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'])] }, async (request, reply) => {
        const user = request.user as unknown as { id: string; organizationId: string; role: string }
        const { contractId, title, type, content } = request.body

        if (!contractId || !type || !content) {
            return reply.code(400).send({ success: false, error: 'Missing required fields' })
        }

        try {
            // Validate contract exists and belongs to the user's organization
            const contract = await app.prisma.contract.findUnique({
                where: { id: contractId, organizationId: user.organizationId }
            })

            if (!contract) {
                return reply.code(404).send({ success: false, error: 'Contract not found' })
            }

            // Maps user input type (e.g. "CONTRACT", "RECEIPT") to Prisma DocumentType Enum.
            // In a real application we would upload the content as PDF/HTML to S3/Supabase Storage, 
            // but here we are just saving it directly as a placeholder in filePath 
            // or we can use filePath as data URI if strictly required, but for MVP saving directly
            // or making a fake path is sufficient per schema since we only have `filePath`.

            // To be robust without DB migration, we will save the raw HTML in a base64 encoded data URI
            // since the Prisma schema only has a `filePath` string field.
            const encodedContent = `data:text/html;charset=utf-8,${encodeURIComponent(content)}`;

            const newDoc = await app.prisma.document.create({
                data: {
                    organizationId: user.organizationId,
                    contractId: contractId,
                    type: type as DocumentTypeRaw,
                    filePath: encodedContent,
                }
            })

            await app.prisma.auditLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId: user.id,
                    action: 'CREATE',
                    entityType: 'DOCUMENT',
                    entityId: newDoc.id,
                    metadata: { title, type, generatedByAi: true }
                }
            })

            return reply.code(201).send({
                success: true,
                data: newDoc
            })
        } catch (error: any) {
            app.log.error(error)
            return reply.code(500).send({ success: false, error: error.message })
        }
    })

    // ── 3. POST /documents/extract-pdf ──────────────────────────
    app.post('/extract-pdf', async (request, reply) => {
        try {
            const data = await request.file()
            if (!data) {
                return reply.code(400).send({ success: false, error: 'No file uploaded' })
            }

            const buffer = await data.toBuffer()
            const result = await pdfParse(buffer)

            return reply.send({ success: true, text: result.text })
        } catch (error: any) {
            app.log.error(error)
            return reply.code(500).send({ success: false, error: error.message || 'Failed to parse PDF' })
        }
    })

    // ── 4. DELETE /documents/:id ────────────────────────────────
    app.delete<{ Params: { id: string } }>('/:id', { preHandler: [requireRole(['OWNER', 'MANAGER'])] }, async (request, reply) => {
        const user = request.user as unknown as { id: string; organizationId: string; role: string }
        const { id } = request.params

        try {
            const doc = await app.prisma.document.findUnique({
                where: { id }
            })

            if (!doc || doc.organizationId !== user.organizationId) {
                return reply.code(404).send({ success: false, error: 'Document not found' })
            }

            await app.prisma.document.delete({
                where: { id }
            })

            await app.prisma.auditLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId: user.id,
                    action: 'DELETE',
                    entityType: 'DOCUMENT',
                    entityId: doc.id
                }
            })

            return reply.send({ success: true, data: { id } })
        } catch (error: any) {
            app.log.error(error)
            return reply.code(500).send({ success: false, error: error.message })
        }
    })
}

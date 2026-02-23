import { FastifyPluginAsync } from 'fastify'
import prismaPlugin from '../plugins/prisma.js'
import ExcelJS from 'exceljs'
import PdfPrinter from 'pdfmake'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const prisma = prismaPlugin;
const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};
const printer = new (PdfPrinter as any)(fonts);

const hesabatRoutes: FastifyPluginAsync = async (app) => {

    app.post('/', {
        schema: {
            body: z.object({
                startDate: z.string(),
                endDate: z.string(),
                contractIds: z.array(z.string()).optional(),
                format: z.enum(['excel', 'pdf'])
            })
        }
    }, async (request, reply) => {
        const { startDate, endDate, contractIds, format } = request.body as any;
        const tenantId = (request.user as any)?.id; // In reality verify organization
        const orgId = (request.user as any)?.organizationId;

        // Fetch data
        const contractsWhere: any = { organizationId: orgId };
        if (contractIds && contractIds.length > 0) {
            contractsWhere.id = { in: contractIds };
        }

        const payments = await app.prisma.payment.findMany({
            where: {
                organizationId: orgId,
                paymentDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                contractId: contractIds ? { in: contractIds } : undefined
            },
            include: { contract: { include: { tenant: true, property: true } } }
        });

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Ödənişlər');

            sheet.columns = [
                { header: 'Tarix', key: 'date', width: 15 },
                { header: 'İcarəçi', key: 'tenant', width: 25 },
                { header: 'Obyekt', key: 'property', width: 25 },
                { header: 'Məbləğ', key: 'amount', width: 15 },
                { header: 'Növ', key: 'type', width: 15 }
            ];

            payments.forEach((p: any) => {
                sheet.addRow({
                    date: p.paymentDate.toISOString().split('T')[0],
                    tenant: p.contract?.tenant?.fullName || 'N/A',
                    property: p.contract?.property?.name || 'N/A',
                    amount: Number(p.amount),
                    type: p.paymentType
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename="hesabat.xlsx"');
            return reply.send(buffer);
        }

        if (format === 'pdf') {
            const docDefinition: any = {
                content: [
                    { text: 'Maliyyə Hesabatı', style: 'header' },
                    { text: `Dövr: ${startDate} - ${endDate}`, margin: [0, 0, 0, 10] },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', '*', 'auto', 'auto'],
                            body: [
                                ['Tarix', 'İcarəçi', 'Obyekt', 'Məbləğ', 'Növ'],
                                ...payments.map((p: any) => [
                                    p.paymentDate.toISOString().split('T')[0],
                                    p.contract?.tenant?.fullName || 'N/A',
                                    p.contract?.property?.name || 'N/A',
                                    Number(p.amount).toFixed(2),
                                    p.paymentType
                                ])
                            ]
                        }
                    }
                ],
                styles: {
                    header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }
                },
                defaultStyle: { font: 'Roboto' }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];

            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));

            return new Promise((resolve) => {
                pdfDoc.on('end', () => {
                    const result = Buffer.concat(chunks);
                    reply.header('Content-Type', 'application/pdf');
                    reply.header('Content-Disposition', 'attachment; filename="hesabat.pdf"');
                    reply.send(result);
                    resolve(null);
                });
                pdfDoc.end();
            });
        }

        reply.status(400).send({ error: 'Invalid format' });
    });

    app.post('/send-email', {
        schema: {
            body: z.object({
                startDate: z.string(),
                endDate: z.string(),
                contractIds: z.array(z.string()).optional(),
                email: z.string().email()
            })
        }
    }, async (request, reply) => {
        const { startDate, endDate, contractIds, email } = request.body as any;
        const orgId = (request.user as any)?.organizationId;

        // Minimal logic for PDF gen internally to attach
        const payments = await app.prisma.payment.findMany({
            where: {
                organizationId: orgId,
                paymentDate: { gte: new Date(startDate), lte: new Date(endDate) },
                contractId: contractIds ? { in: contractIds } : undefined
            },
            include: { contract: { include: { tenant: true, property: true } } }
        });

        const docDefinition: any = {
            content: [
                { text: 'Maliyyə Hesabatı', style: 'header' },
                { text: `Dövr: ${startDate} - ${endDate}`, margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        body: [
                            ['Tarix', 'İcarəçi', 'Məbləğ'],
                            ...payments.map((p: any) => [
                                p.paymentDate.toISOString().split('T')[0],
                                p.contract?.tenant?.fullName || 'N/A',
                                Number(p.amount).toFixed(2)
                            ])
                        ]
                    }
                }
            ],
            defaultStyle: { font: 'Roboto' }
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));

        await new Promise((resolve) => {
            pdfDoc.on('end', resolve);
            pdfDoc.end();
        });

        const pdfBuffer = Buffer.concat(chunks);

        // Nodemailer setup
        const transporter = nodemailer.createTransport({
            host: process.env['SMTP_HOST'] || 'smtp.ethereal.email',
            port: Number(process.env['SMTP_PORT']) || 587,
            auth: {
                user: process.env['SMTP_USER'],
                pass: process.env['SMTP_PASS']
            }
        });

        await transporter.sendMail({
            from: '"İcarə Pro" <noreply@icarepro.az>',
            to: email,
            subject: `İcarə Pro Maliyyə Hesabatı (${startDate} - ${endDate})`,
            text: 'Maliyyə hesabatınız əlavədə təqdim olunur.',
            attachments: [{ filename: 'hesabat.pdf', content: pdfBuffer }]
        });

        return { success: true, message: 'Email sent successfully' };
    });
}
export default hesabatRoutes;

import { FastifyPluginAsync } from 'fastify'
import ExcelJS from 'exceljs'
import PdfPrinter from 'pdfmake'
import { z } from 'zod'
import { Resend } from 'resend'

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};
const printer = new (PdfPrinter as any)(fonts);

const rentalTypeLabel: Record<string, string> = {
    RESIDENTIAL_LONG: 'Yaşayış (uzunmüddətli)',
    COMMERCIAL: 'Kommersiya',
    RESIDENTIAL_SHORT: 'Yaşayış (qısamüddətli)',
    PARKING: 'Dayanacaq',
    SUBLEASE: 'Alt-icarə'
};

const payloadSchema = z.object({
    startDate: z.string(),
    endDate: z.string(),
    contractIds: z.array(z.string()).optional(),
    format: z.enum(['excel', 'pdf']),
    direction: z.enum(['all', 'income', 'debt']).optional().default('all'),
});

const emailPayloadSchema = z.object({
    startDate: z.string(),
    endDate: z.string(),
    contractIds: z.array(z.string()).optional(),
    email: z.string().email()
});

function buildPdfDoc(payments: any[], startDate: string, endDate: string, orgName?: string) {
    const now = new Date().toLocaleString('az-AZ', { timeZone: 'Asia/Baku' });
    const totalIncome = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

    const tableBody = [
        [
            { text: '№', style: 'tableHeader' },
            { text: 'Tarix', style: 'tableHeader' },
            { text: 'Müqavilə', style: 'tableHeader' },
            { text: 'İcarəçi', style: 'tableHeader' },
            { text: 'Obyekt', style: 'tableHeader' },
            { text: 'İstifadə məqsədi', style: 'tableHeader' },
            { text: 'Növü', style: 'tableHeader' },
            { text: 'Məbləğ (₼)', style: 'tableHeader' },
        ],
        ...payments.map((p: any, i: number) => [
            { text: String(i + 1), alignment: 'center', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: new Date(p.paymentDate).toLocaleDateString('az-AZ'), fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: p.contract?.number || '-', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: p.contract?.tenant?.fullName || '-', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: p.contract?.property?.name || '-', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: rentalTypeLabel[p.contract?.rentalType] || p.contract?.rentalType || '-', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: p.paymentType || '-', fontSize: 9, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: Number(p.amount).toFixed(2), alignment: 'right', fontSize: 9, bold: true, fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
        ]),
        // Total row
        [
            { text: '', colSpan: 7, border: [false, true, false, false] },
            {}, {}, {}, {}, {}, {},
            { text: `${totalIncome.toFixed(2)} ₼`, bold: true, fontSize: 10, color: '#1a56db', alignment: 'right', border: [false, true, false, false] }
        ]
    ];

    return {
        pageSize: 'A4' as any,
        pageOrientation: 'landscape' as any,
        pageMargins: [30, 70, 30, 60] as [number, number, number, number],
        header: (currentPage: number) => ({
            margin: [30, 20, 30, 0],
            columns: [
                {
                    stack: [
                        { text: 'İCARƏ PRO', style: 'brandName' },
                        { text: orgName || 'Maliyyə İdarəetmə Sistemi', fontSize: 8, color: '#6b7280' }
                    ]
                },
                {
                    stack: [
                        { text: 'Maliyyə Hesabatı', style: 'reportTitle' },
                        { text: `Dövr: ${startDate} — ${endDate}`, fontSize: 8, color: '#6b7280', alignment: 'right' }
                    ],
                    alignment: 'right'
                }
            ]
        }),
        footer: (currentPage: number, pageCount: number) => ({
            margin: [30, 0, 30, 10],
            columns: [
                { text: 'İcarə Pro | icarepro.pages.dev', fontSize: 8, color: '#9ca3af' },
                { text: `Yaradılıb: ${now}`, fontSize: 8, color: '#9ca3af', alignment: 'center' },
                { text: `Səhifə ${currentPage} / ${pageCount}`, fontSize: 8, color: '#9ca3af', alignment: 'right' }
            ],
            lineAbove: { color: '#e5e7eb', lineWidth: 0.5 }
        }),
        content: [
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 780, y2: 0, lineWidth: 1, lineColor: '#1a56db' }],
                margin: [0, 0, 0, 14]
            },
            {
                table: {
                    headerRows: 1,
                    widths: [20, 55, 55, '*', '*', 90, 50, 60],
                    body: tableBody,
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#e5e7eb',
                }
            },
            {
                margin: [0, 16, 0, 0],
                columns: [
                    { text: '' },
                    {
                        table: {
                            widths: ['*', 100],
                            body: [
                                [
                                    { text: 'Ümumi Mədaxil:', bold: true, fontSize: 10, border: [false, false, false, false] },
                                    { text: `${totalIncome.toFixed(2)} ₼`, bold: true, fontSize: 10, color: '#16a34a', alignment: 'right', border: [false, false, false, false] }
                                ]
                            ]
                        },
                        layout: 'noBorders',
                        width: 240
                    }
                ]
            }
        ],
        styles: {
            brandName: { fontSize: 16, bold: true, color: '#1a56db' },
            reportTitle: { fontSize: 13, bold: true, color: '#111827' },
            tableHeader: { bold: true, fontSize: 9, fillColor: '#1a56db', color: 'white', margin: [2, 4, 2, 4] },
        },
        defaultStyle: { font: 'Roboto', fontSize: 9 }
    };
}

const hesabatRoutes: FastifyPluginAsync = async (app) => {

    app.post('/', async (request, reply) => {
        const parsed = payloadSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: 'Validation error', details: parsed.error });
        const { startDate, endDate, contractIds, format, direction } = parsed.data;
        const orgId = (request.user as any)?.organizationId;

        const payments = await app.prisma.payment.findMany({
            where: {
                organizationId: orgId,
                paymentDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                contractId: contractIds && contractIds.length > 0 ? { in: contractIds } : undefined
            },
            include: { contract: { include: { tenant: true, property: true } } },
            orderBy: { paymentDate: 'asc' }
        });

        // Compute debts per contract if direction filter includes debt
        let allContracts: any[] = [];
        if (direction === 'all' || direction === 'debt') {
            allContracts = await app.prisma.contract.findMany({
                where: {
                    organizationId: orgId,
                    status: 'ACTIVE',
                    id: contractIds && contractIds.length > 0 ? { in: contractIds } : undefined
                },
                include: { tenant: true, property: true }
            });
        }

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'İcarə Pro';
            workbook.lastModifiedBy = 'İcarə Pro';
            workbook.created = new Date();

            const sheet = workbook.addWorksheet('Ödənişlər', {
                pageSetup: { fitToPage: true, orientation: 'landscape' }
            });

            // Header row
            sheet.mergeCells('A1:H1');
            sheet.getCell('A1').value = `İCARƏ PRO — Maliyyə Hesabatı | Dövr: ${startDate} — ${endDate}`;
            sheet.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
            sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
            sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 32;

            // Column headers
            const headers = ['№', 'Tarix', 'Müqavilə', 'İcarəçi', 'Obyekt', 'İstifadə məqsədi', 'Növü', 'Məbləğ (₼)'];
            const headerRow = sheet.getRow(2);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
                cell.alignment = { vertical: 'middle', horizontal: i === 7 ? 'right' : 'center' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } } };
            });
            headerRow.height = 24;

            // Data rows
            payments.forEach((p: any, i) => {
                const row = sheet.getRow(i + 3);
                const bg = i % 2 === 0 ? 'FFf8f9fa' : 'FFFFFFFF';
                const vals = [
                    i + 1,
                    new Date(p.paymentDate).toLocaleDateString('az-AZ'),
                    p.contract?.number || '-',
                    p.contract?.tenant?.fullName || '-',
                    p.contract?.property?.name || '-',
                    rentalTypeLabel[p.contract?.rentalType] || p.contract?.rentalType || '-',
                    p.paymentType,
                    Number(p.amount)
                ];
                vals.forEach((v, ci) => {
                    const cell = row.getCell(ci + 1);
                    cell.value = v;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    if (ci === 7) {
                        cell.numFmt = '#,##0.00 ₼';
                        cell.alignment = { horizontal: 'right' };
                        cell.font = { bold: true, color: { argb: 'FF16a34a' } };
                    }
                });
            });

            // Total row
            const totalRow = sheet.getRow(payments.length + 3);
            const totalAmount = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
            sheet.mergeCells(`A${totalRow.number}:G${totalRow.number}`);
            totalRow.getCell(1).value = 'Ümumi Mədaxil:';
            totalRow.getCell(1).font = { bold: true, size: 11 };
            totalRow.getCell(1).alignment = { horizontal: 'right' };
            totalRow.getCell(8).value = totalAmount;
            totalRow.getCell(8).numFmt = '#,##0.00 ₼';
            totalRow.getCell(8).font = { bold: true, size: 12, color: { argb: 'FF1a56db' } };
            totalRow.getCell(8).alignment = { horizontal: 'right' };
            totalRow.height = 26;

            // Auto-fit columns
            sheet.columns = [
                { key: 'n', width: 5 },
                { key: 'date', width: 14 },
                { key: 'contract', width: 16 },
                { key: 'tenant', width: 26 },
                { key: 'property', width: 26 },
                { key: 'rental_type', width: 24 },
                { key: 'type', width: 14 },
                { key: 'amount', width: 16 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename="hesabat.xlsx"');
            return reply.send(buffer);
        }

        if (format === 'pdf') {
            const org = await app.prisma.organization.findFirst({ where: { id: orgId } });
            const docDefinition = buildPdfDoc(payments, startDate, endDate, org?.name);
            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];

            pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

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

    app.post('/send-email', async (request, reply) => {
        const parsed = emailPayloadSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: 'Validation error', details: parsed.error });
        const { startDate, endDate, contractIds, email } = parsed.data;
        const orgId = (request.user as any)?.organizationId;

        const payments = await app.prisma.payment.findMany({
            where: {
                organizationId: orgId,
                paymentDate: { gte: new Date(startDate), lte: new Date(endDate) },
                contractId: contractIds && contractIds.length > 0 ? { in: contractIds } : undefined
            },
            include: { contract: { include: { tenant: true, property: true } } },
            orderBy: { paymentDate: 'asc' }
        });

        const org = await app.prisma.organization.findFirst({ where: { id: orgId } });
        const docDefinition = buildPdfDoc(payments, startDate, endDate, org?.name);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

        await new Promise((resolve) => {
            pdfDoc.on('end', resolve);
            pdfDoc.end();
        });

        const pdfBuffer = Buffer.concat(chunks);

        // Send via Resend (consistent with email.ts)
        const resend = new Resend(process.env['RESEND_API_KEY']);
        await resend.emails.send({
            from: 'icare@icarepro.az',
            to: email,
            subject: `İcarə Pro — Maliyyə Hesabatı (${startDate} — ${endDate})`,
            html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                    <h2 style="color:#1a56db;margin-bottom:4px">İcarə Pro</h2>
                    <p style="color:#6b7280;font-size:13px;margin-top:0">Maliyyə Hesabatı</p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
                    <p>Salam!</p>
                    <p><b>${startDate} — ${endDate}</b> dövrü üçün maliyyə hesabatınız əlavə sənəd kimi təqdim edilib.</p>
                    <p>Cəmi ödəniş sayı: <b>${payments.length}</b></p>
                    <p>Cəmi məbləğ: <b style="color:#1a56db">${payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(2)} ₼</b></p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
                    <p style="color:#9ca3af;font-size:12px">İcarə Pro | icarepro.pages.dev</p>
                </div>
            `,
            attachments: [{ filename: `hesabat-${startDate}-${endDate}.pdf`, content: pdfBuffer }]
        });

        return { success: true, message: 'Hesabat email-ə göndərildi' };
    });
}

export default hesabatRoutes;

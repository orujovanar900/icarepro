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
    const totalIncome = payments.filter((p: any) => p.paymentType !== 'Borc').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalDebt = payments.filter((p: any) => p.paymentType === 'Borc').reduce((s: number, p: any) => s + Number(p.amount), 0);

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
            { text: p.paymentType || '-', fontSize: 9, color: p.paymentType === 'Borc' ? '#ef4444' : '#111827', bold: p.paymentType === 'Borc', fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
            { text: Number(p.amount).toFixed(2), alignment: 'right', fontSize: 9, bold: true, color: p.paymentType === 'Borc' ? '#ef4444' : '#16a34a', fillColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' },
        ])
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
                                ],
                                [
                                    { text: 'Ümumi Borc:', bold: true, fontSize: 10, border: [false, false, false, false] },
                                    { text: `${totalDebt.toFixed(2)} ₼`, bold: true, fontSize: 10, color: '#ef4444', alignment: 'right', border: [false, false, false, false] }
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

        let payments: any[] = [];

        if (direction === 'all' || direction === 'income') {
            payments = await app.prisma.payment.findMany({
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
        }

        // Compute debts per contract if direction filter includes debt
        if (direction === 'all' || direction === 'debt') {
            const allContracts = await app.prisma.contract.findMany({
                where: {
                    organizationId: orgId,
                    status: 'ACTIVE',
                    id: contractIds && contractIds.length > 0 ? { in: contractIds } : undefined
                },
                include: { tenant: true, property: true, payments: true }
            });

            const targetDate = new Date(endDate);
            allContracts.forEach((c: any) => {
                const start = new Date(c.startDate);
                const end = c.endDate < targetDate ? new Date(c.endDate) : targetDate;
                const monthsElapsed = Math.max(0,
                    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
                );
                const totalExpected = Number(c.monthlyRent) * monthsElapsed;
                const totalPaid = c.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
                const debt = Math.max(0, totalExpected - totalPaid);

                if (debt > 0) {
                    payments.push({
                        paymentDate: targetDate, // show debt on the end date of report
                        amount: debt,
                        paymentType: 'Borc',
                        contract: c,
                    });
                }
            });
        }

        // Sort by date just in case
        payments.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

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
            const baseRow = payments.length + 3;
            const totalIncome = payments.filter((p: any) => p.paymentType !== 'Borc').reduce((s: number, p: any) => s + Number(p.amount), 0);
            const totalDebt = payments.filter((p: any) => p.paymentType === 'Borc').reduce((s: number, p: any) => s + Number(p.amount), 0);

            // Income
            sheet.mergeCells(`A${baseRow}:G${baseRow}`);
            const t1 = sheet.getRow(baseRow);
            t1.getCell(1).value = 'Ümumi Mədaxil:';
            t1.getCell(1).font = { bold: true, size: 11 };
            t1.getCell(1).alignment = { horizontal: 'right' };
            t1.getCell(8).value = totalIncome;
            t1.getCell(8).numFmt = '#,##0.00 ₼';
            t1.getCell(8).font = { bold: true, size: 11, color: { argb: 'FF16a34a' } };
            t1.getCell(8).alignment = { horizontal: 'right' };

            // Debt
            sheet.mergeCells(`A${baseRow + 1}:G${baseRow + 1}`);
            const t2 = sheet.getRow(baseRow + 1);
            t2.getCell(1).value = 'Ümumi Borc:';
            t2.getCell(1).font = { bold: true, size: 11 };
            t2.getCell(1).alignment = { horizontal: 'right' };
            t2.getCell(8).value = totalDebt;
            t2.getCell(8).numFmt = '#,##0.00 ₼';
            t2.getCell(8).font = { bold: true, size: 11, color: { argb: 'FFef4444' } };
            t2.getCell(8).alignment = { horizontal: 'right' };

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

    const expensePayloadSchema = z.object({
        startDate: z.string(),
        endDate: z.string(),
        category: z.string().optional(),
        format: z.enum(['excel', 'pdf'])
    });

    app.post('/expenses', async (request, reply) => {
        const parsed = expensePayloadSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: 'Validation error', details: parsed.error });
        const { startDate, endDate, category, format } = parsed.data;
        const orgId = (request.user as any)?.organizationId;

        const expenses = await app.prisma.expense.findMany({
            where: {
                organizationId: orgId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                category: category || undefined
            },
            include: { createdByUser: true },
            orderBy: { date: 'asc' }
        });

        const totalAmount = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
        const org = await app.prisma.organization.findFirst({ where: { id: orgId } });

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Xərclər', { pageSetup: { fitToPage: true } });

            sheet.mergeCells('A1:E1');
            sheet.getCell('A1').value = `İCARƏ PRO — Xərclər Hesabatı | Dövr: ${startDate} — ${endDate}`;
            sheet.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFef4444' } };
            sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 32;

            const headers = ['№', 'Tarix', 'Kateqoriya', 'Açıqlama', 'Məbləğ (₼)'];
            const headerRow = sheet.getRow(2);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFef4444' } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } } };
            });

            expenses.forEach((e: any, i) => {
                const r = sheet.getRow(i + 3);
                r.getCell(1).value = i + 1;
                r.getCell(2).value = new Date(e.date).toLocaleDateString('az-AZ');
                r.getCell(3).value = e.category;
                r.getCell(4).value = e.description || '';
                r.getCell(5).value = Number(e.amount);
                r.getCell(5).numFmt = '#,##0.00 ₼';
            });

            const tr = sheet.getRow(expenses.length + 3);
            sheet.mergeCells(`A${tr.number}:D${tr.number}`);
            tr.getCell(1).value = 'Yekun Xərc:';
            tr.getCell(1).alignment = { horizontal: 'right' };
            tr.getCell(1).font = { bold: true };
            tr.getCell(5).value = totalAmount;
            tr.getCell(5).font = { bold: true, color: { argb: 'FFef4444' } };
            tr.getCell(5).numFmt = '#,##0.00 ₼';

            sheet.columns = [
                { width: 5 }, { width: 14 }, { width: 22 }, { width: 40 }, { width: 16 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return reply.send(buffer);
        }

        if (format === 'pdf') {
            const tableBody = [
                [
                    { text: '№', bold: true, fillColor: '#ef4444', color: 'white' },
                    { text: 'Tarix', bold: true, fillColor: '#ef4444', color: 'white' },
                    { text: 'Kateqoriya', bold: true, fillColor: '#ef4444', color: 'white' },
                    { text: 'Açıqlama', bold: true, fillColor: '#ef4444', color: 'white' },
                    { text: 'Məbləğ (₼)', bold: true, fillColor: '#ef4444', color: 'white' },
                ],
                ...expenses.map((e: any, i: number) => [
                    String(i + 1),
                    new Date(e.date).toLocaleDateString('az-AZ'),
                    e.category,
                    e.description || '-',
                    { text: Number(e.amount).toFixed(2), alignment: 'right' }
                ]),
            ];

            const docDefinition = {
                pageSize: 'A4' as any,
                content: [
                    { text: `İcarə Pro - Xərclər Hesabatı`, fontSize: 16, bold: true, color: '#ef4444', margin: [0, 0, 0, 8] },
                    { text: `Dövr: ${startDate} — ${endDate}`, fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 16] },
                    {
                        table: {
                            headerRows: 1,
                            widths: [20, 60, 80, '*', 70],
                            body: tableBody
                        }
                    },
                    {
                        margin: [0, 16, 0, 0],
                        table: {
                            widths: ['*', 100],
                            body: [
                                [
                                    { text: 'Yekun Xərc:', bold: true, alignment: 'right', border: [false, false, false, false] },
                                    { text: `${totalAmount.toFixed(2)} ₼`, bold: true, color: '#ef4444', alignment: 'right', border: [false, false, false, false] }
                                ]
                            ]
                        },
                        layout: 'noBorders'
                    }
                ],
                defaultStyle: { font: 'Roboto', fontSize: 10 }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];
            pdfDoc.on('data', (c: Buffer) => chunks.push(c));
            return new Promise((resolve) => {
                pdfDoc.on('end', () => {
                    reply.header('Content-Type', 'application/pdf');
                    reply.send(Buffer.concat(chunks));
                    resolve(null);
                });
                pdfDoc.end();
            });
        }
        reply.status(400).send({ error: 'Invalid format' });
    });

    const propertyPayloadSchema = z.object({
        startDate: z.string(),
        endDate: z.string(),
        direction: z.enum(['all', 'income', 'debt']).optional().default('all'),
        format: z.enum(['excel', 'pdf'])
    });

    app.post('/properties', async (request, reply) => {
        const parsed = propertyPayloadSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: 'Validation error', details: parsed.error });
        const { startDate, endDate, direction, format } = parsed.data;
        const orgId = (request.user as any)?.organizationId;

        const allProperties = await app.prisma.property.findMany({
            where: { organizationId: orgId, isActive: true },
            orderBy: { name: 'asc' }
        });

        // Pre-fetch active contracts for properties
        const allContracts = await app.prisma.contract.findMany({
            where: { organizationId: orgId, status: 'ACTIVE' },
            include: { tenant: true, payments: true }
        });

        const targetDate = new Date(endDate);
        const startTargetDate = new Date(startDate);

        let reportData: any[] = [];
        let grandTotalIncome = 0;
        let grandTotalDebt = 0;

        for (const prop of allProperties) {
            const contract = allContracts.find((c: any) => c.propertyId === prop.id);
            let income = 0;
            let debt = 0;

            if (contract) {
                // Calculator income in the selected date range
                income = contract.payments
                    .filter((p: any) => p.paymentType !== 'Borc')
                    .filter((p: any) => new Date(p.paymentDate) >= startTargetDate && new Date(p.paymentDate) <= targetDate)
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

                // Calculate overall debt up to end date
                const start = new Date(contract.startDate);
                const end = contract.endDate < targetDate ? new Date(contract.endDate) : targetDate;
                const monthsElapsed = Math.max(0,
                    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
                );
                const totalExpected = Number(contract.monthlyRent) * monthsElapsed;
                const totalPaid = contract.payments
                    .filter((p: any) => new Date(p.paymentDate) <= targetDate) // All payments before/on endDate
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

                debt = Math.max(0, totalExpected - totalPaid);
            }

            if (direction === 'income' && income <= 0) continue;
            if (direction === 'debt' && debt <= 0) continue;

            grandTotalIncome += income;
            grandTotalDebt += debt;

            reportData.push({
                property: prop,
                contract,
                income,
                debt
            });
        }

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Obyektlər', { pageSetup: { fitToPage: true, orientation: 'landscape' } });

            sheet.mergeCells('A1:G1');
            const titleRowType = direction === 'income' ? 'Mədaxil ' : direction === 'debt' ? 'Borc ' : '';
            sheet.getCell('A1').value = `İCARƏ PRO — Obyektlər üzrə ${titleRowType}Hesabatı | Dövr: ${startDate} — ${endDate}`;
            sheet.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
            sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 32;

            const headers = ['№', 'Obyekt', 'Nömrə/Ünvan', 'İcarəçi', 'Məbləğ (₼)', 'Mədaxil (₼)', 'Borc (₼)'];
            const headerRow = sheet.getRow(2);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } } };
            });

            reportData.forEach((r: any, i) => {
                const row = sheet.getRow(i + 3);
                row.getCell(1).value = i + 1;
                row.getCell(2).value = r.property.name;
                row.getCell(3).value = r.property.number || r.property.address || '-';
                row.getCell(4).value = r.contract?.tenant?.fullName || '-';
                row.getCell(5).value = r.contract ? Number(r.contract.monthlyRent) : 0;
                row.getCell(5).numFmt = '#,##0.00 ₼';
                row.getCell(6).value = r.income;
                row.getCell(6).numFmt = '#,##0.00 ₼';
                row.getCell(6).font = { color: { argb: 'FF16a34a' } }; // green
                row.getCell(7).value = r.debt;
                row.getCell(7).numFmt = '#,##0.00 ₼';
                row.getCell(7).font = { color: { argb: 'FFef4444' } }; // red
            });

            const trObj = sheet.getRow(reportData.length + 3);
            sheet.mergeCells(`A${trObj.number}:E${trObj.number}`);
            trObj.getCell(1).value = 'Yekun cəmlər:';
            trObj.getCell(1).alignment = { horizontal: 'right' };
            trObj.getCell(1).font = { bold: true };
            trObj.getCell(6).value = grandTotalIncome;
            trObj.getCell(6).font = { bold: true, color: { argb: 'FF16a34a' } };
            trObj.getCell(6).numFmt = '#,##0.00 ₼';
            trObj.getCell(7).value = grandTotalDebt;
            trObj.getCell(7).font = { bold: true, color: { argb: 'FFef4444' } };
            trObj.getCell(7).numFmt = '#,##0.00 ₼';

            sheet.columns = [
                { width: 5 }, { width: 25 }, { width: 30 }, { width: 25 }, { width: 14 }, { width: 16 }, { width: 16 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return reply.send(buffer);
        }

        if (format === 'pdf') {
            const tableBody = [
                [
                    { text: '№', bold: true, fillColor: '#1a56db', color: 'white' },
                    { text: 'Obyekt', bold: true, fillColor: '#1a56db', color: 'white' },
                    { text: 'Nömrə/Ünvan', bold: true, fillColor: '#1a56db', color: 'white' },
                    { text: 'İcarəçi', bold: true, fillColor: '#1a56db', color: 'white' },
                    { text: 'Məbləğ (₼)', bold: true, fillColor: '#1a56db', color: 'white', alignment: 'right' },
                    { text: 'Mədaxil (₼)', bold: true, fillColor: '#1a56db', color: 'white', alignment: 'right' },
                    { text: 'Borc (₼)', bold: true, fillColor: '#1a56db', color: 'white', alignment: 'right' },
                ],
                ...reportData.map((r: any, i: number) => {
                    const isBg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
                    return [
                        { text: String(i + 1), fillColor: isBg },
                        { text: r.property.name, fillColor: isBg },
                        { text: r.property.number || r.property.address || '-', fillColor: isBg },
                        { text: r.contract?.tenant?.fullName || '-', fillColor: isBg },
                        { text: r.contract ? Number(r.contract.monthlyRent).toFixed(2) : '0.00', alignment: 'right', fillColor: isBg },
                        { text: r.income.toFixed(2), color: '#16a34a', bold: true, alignment: 'right', fillColor: isBg },
                        { text: r.debt.toFixed(2), color: '#ef4444', bold: true, alignment: 'right', fillColor: isBg }
                    ];
                }),
                [
                    { text: 'Yekun:', colSpan: 5, bold: true, alignment: 'right' }, {}, {}, {}, {},
                    { text: grandTotalIncome.toFixed(2) + ' ₼', color: '#16a34a', bold: true, alignment: 'right' },
                    { text: grandTotalDebt.toFixed(2) + ' ₼', color: '#ef4444', bold: true, alignment: 'right' }
                ]
            ];

            const docDefinition = {
                pageSize: 'A4' as any,
                pageOrientation: 'landscape' as any,
                content: [
                    { text: `İcarə Pro - Obyektlər üzrə Hesabat`, fontSize: 16, bold: true, color: '#1a56db', margin: [0, 0, 0, 8] },
                    { text: `Dövr: ${startDate} — ${endDate}`, fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 16] },
                    {
                        table: {
                            headerRows: 1,
                            widths: [20, 100, '*', 120, 60, 60, 60],
                            body: tableBody
                        }
                    }
                ],
                defaultStyle: { font: 'Roboto', fontSize: 9 }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];
            pdfDoc.on('data', (c: Buffer) => chunks.push(c));
            return new Promise((resolve) => {
                pdfDoc.on('end', () => {
                    reply.header('Content-Type', 'application/pdf');
                    reply.send(Buffer.concat(chunks));
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

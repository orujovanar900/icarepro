import * as React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export async function generateContractPdf(contract: any) {
    // Determine tenant name display
    let tenantName = '-';
    let voen = '';
    let phone = '';

    if (contract.tenant) {
        if (contract.tenant.tenantType === 'fiziki') {
            tenantName = [contract.tenant.lastName, contract.tenant.firstName, contract.tenant.fatherName].filter(Boolean).join(' ');
            voen = contract.tenant.fin || '';
        } else {
            tenantName = contract.tenant.companyName || '';
            voen = contract.tenant.voen || '';
        }
        phone = contract.tenant.phone || '';
    }

    // Amount & Date Calculations
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);

    // Create an invisible iframe to host our print payload isolated from current DOM styles
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '210mm'; // A4 width
    // Needs to be rendered somewhere visible to html2canvas, but outside viewport
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);

    const docStr = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    body {
        margin: 0;
        padding: 20mm;
        font-family: 'Times New Roman', serif;
        font-size: 13pt;
        line-height: 1.6;
        color: #000;
        background: #fff;
    }
    .header {
        position: relative;
        text-align: center;
        margin-bottom: 40px;
    }
    .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 80pt;
        font-weight: 900;
        color: rgba(201, 168, 76, 0.08); /* #C9A84C */
        pointer-events: none;
        letter-spacing: 0.1em;
        z-index: 0;
    }
    .title {
        font-size: 16pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 5px;
        position: relative;
        z-index: 10;
        letter-spacing: 1px;
    }
    .subtitle {
        font-size: 11pt;
        color: #666;
        border-bottom: 1px solid #eee;
        padding-bottom: 15px;
        position: relative;
        z-index: 10;
    }
    .grid {
        display: flex;
        gap: 40px;
        margin-bottom: 25px;
        position: relative;
        z-index: 10;
    }
    .col {
        flex: 1;
    }
    .grid-title {
        font-size: 10pt;
        font-weight: bold;
        color: #999;
        text-transform: uppercase;
        margin-bottom: 15px;
        letter-spacing: 1px;
    }
    .card {
        background: #f9f9fa;
        border: 1px solid #f0f0f0;
        padding: 15px;
        border-radius: 4px;
        height: 100%;
        box-sizing: border-box;
    }
    .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 5px;
        margin-bottom: 8px;
    }
    .row:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    .label {
        color: #666;
        font-size: 11pt;
        font-style: italic;
    }
    .val {
        font-weight: bold;
        text-align: right;
        max-width: 60%;
    }
    .val-muted {
        color: #999;
        font-weight: normal;
    }
    .full-width {
        margin-top: 30px;
        position: relative;
        z-index: 10;
    }
    .conditions {
        margin-top: 30px;
    }
    .condition-title {
        font-weight: bold;
        margin-bottom: 10px;
    }
    .condition-text {
        text-align: justify;
    }
</style>
</head>
<body>
    <div class="watermark">İCARƏ PRO</div>
    
    <div class="header">
        <div class="title">İCARƏ MÜQAVİLƏSİ № ${contract.number}</div>
        <div class="subtitle">Bakı şəhəri &nbsp;&nbsp;•&nbsp;&nbsp; ${format(new Date(), 'dd.MM.yyyy')}</div>
    </div>

    <div class="grid">
        <div class="col">
            <div class="grid-title">Tərəflər</div>
            <div class="card">
                <div class="row"><span class="label">İcarəyə verən:</span> <span class="val">Mülkiyyətçi / İdarəçi</span></div>
                <div class="row"><span class="label">İcarəçi:</span> <span class="val">${tenantName}</span></div>
                <div class="row"><span class="label">VÖEN/FİN:</span> <span class="val ${!voen ? 'val-muted' : ''}">${voen || '(Tələb olunmur)'}</span></div>
                <div class="row"><span class="label">Əlaqə:</span> <span class="val ${!phone ? 'val-muted' : ''}">${phone || '(Daxil edilməyib)'}</span></div>
            </div>
        </div>
        <div class="col">
            <div class="grid-title">Obyekt Və Maliyyə</div>
            <div class="card">
                <div class="row"><span class="label">Ünvan:</span> <span class="val">${contract.property?.name || contract.property?.address || 'Qeyd edilməyib'}</span></div>
                <div class="row"><span class="label">Məbləğ:</span> <span class="val">${Number(contract.monthlyRent).toLocaleString('az-AZ')} ₼</span></div>
                <div class="row"><span class="label">Depozit:</span> <span class="val ${!contract.depositAmount ? 'val-muted' : ''}">${Number(contract.depositAmount) > 0 ? Number(contract.depositAmount).toLocaleString('az-AZ') + ' ₼' : '(Yoxdur)'}</span></div>
                <div class="row"><span class="label">Müddət:</span> <span class="val">${format(startDate, 'dd.MM.yyyy')} – ${format(endDate, 'dd.MM.yyyy')}</span></div>
            </div>
        </div>
    </div>

    <div class="full-width">
        <div class="grid-title">Ödəniş Qrafiki</div>
        <div class="card">
            <div class="row">
                <span class="label">Ödəniş Rejimi:</span> 
                <span class="val">${contract.paymentMode === 'FIXED_DAY' ? `Hər ayın ${contract.paymentDay}-ü` : 'Ayın əvvəlindən'}</span>
            </div>
        </div>
    </div>

    <div style="margin-top: 50px;">
        <div style="display: flex; justify-content: space-between; margin-top: 50px;">
            <div style="text-align: center;">
                <div style="border-bottom: 1px solid #000; width: 150px; margin-bottom: 5px;"></div>
                <div style="font-size: 10pt; color: #666;">İcarəyə Verən (İmza)</div>
            </div>
            <div style="text-align: center;">
                <div style="border-bottom: 1px solid #000; width: 150px; margin-bottom: 5px;"></div>
                <div style="font-size: 10pt; color: #666;">İcarəçi (İmza)</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Unable to create PDF template.");
    }

    iframeDoc.open();
    iframeDoc.write(docStr);
    iframeDoc.close();

    // Wait slightly for fonts to load in iframe
    await new Promise(r => setTimeout(r, 600));

    const canvas = await html2canvas(iframeDoc.body, {
        scale: 2, // Retain high resolution 
        useCORS: true,
        logging: false
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const safeTenantName = tenantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`muqavile-${contract.number}-${safeTenantName}.pdf`);

    // Clean up
    document.body.removeChild(iframe);
}

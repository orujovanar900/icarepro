import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY']);

export async function sendDebtAlert(to: string, data: {
    tenantName: string,
    propertyName: string,
    debtAmount: number,
    contractNumber: string
}) {
    await resend.emails.send({
        from: 'icare@icarepro.az',
        to,
        subject: `⚠️ Borc xəbərdarlığı — ${data.tenantName}`,
        html: `
      <h2>Borc Bildirişi</h2>
      <p>Müqavilə: <b>${data.contractNumber}</b></p>
      <p>İcarəçi: <b>${data.tenantName}</b></p>
      <p>Obyekt: <b>${data.propertyName}</b></p>
      <p>Borc məbləği: <b style="color:red">${data.debtAmount} ₼</b></p>
      <p>Zəhmət olmasa, icarəçi ilə əlaqə saxlayın.</p>
      <a href="${process.env['FRONTEND_URL'] || 'https://icare-pro-afd3bf.netlify.app'}/contracts">
        Müqavilələrə bax →
      </a>
    `
    });
}

export async function sendExpiringContractAlert(to: string, data: {
    tenantName: string,
    propertyName: string,
    endDate: string,
    daysLeft: number,
    contractNumber: string
}) {
    await resend.emails.send({
        from: 'icare@icarepro.az',
        to,
        subject: `📅 Müqavilə başa çatır — ${data.daysLeft} gün qalıb`,
        html: `
      <h2>Müqavilə Xəbərdarlığı</h2>
      <p>Müqavilə: <b>${data.contractNumber}</b></p>
      <p>İcarəçi: <b>${data.tenantName}</b></p>
      <p>Obyekt: <b>${data.propertyName}</b></p>
      <p>Bitmə tarixi: <b>${data.endDate}</b></p>
      <p>Qalan müddət: <b style="color:orange">${data.daysLeft} gün</b></p>
      <a href="${process.env['FRONTEND_URL'] || 'https://icare-pro-afd3bf.netlify.app'}/contracts">
        Müqaviləni yenilə →
      </a>
    `
    });
}

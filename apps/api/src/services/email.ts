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

export async function sendPasswordReset(to: string, resetUrl: string) {
  await resend.emails.send({
    from: 'icare@icarepro.az',
    to,
    subject: '🔐 İcarəPro — Şifrə Sıfırlama',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#C9A84C">Şifrə Sıfırlama</h2>
        <p>Salam! Şifrənizi sıfırlamaq üçün aşağıdakı düyməyə klikləyin:</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#C9A84C;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">
          Şifrəni Sıfırla
        </a>
        <p style="color:#888;font-size:13px">Bu link 1 saat ərzində etibarlıdır.<br/>
        Siz bu tələbi göndərməmisinizsə, bu emaili nəzərə almayın.</p>
      </div>
    `
  });
}

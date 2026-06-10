/**
 * Notification dispatcher: Email (Nodemailer) + WhatsApp (Fonnte API)
 * In-app notifications are stored directly in Supabase.
 */

interface EmailPayload {
  to: string
  subject: string
  html: string
}

interface WAPayload {
  target: string   // phone number with country code e.g. 628xxxxxxxx
  message: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // Server-side only — uses fetch to an internal API route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/notify/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Email send failed: ${err}`)
  }
}

export async function sendWhatsApp(payload: WAPayload): Promise<void> {
  const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN
  if (!FONNTE_TOKEN) return // skip silently in dev without token

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: FONNTE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: payload.target,
      message: payload.message,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`WhatsApp send failed: ${err}`)
  }
}

export function buildDNOverdueEmail(dnNumber: string, debtorName: string, daysOverdue: number) {
  return {
    subject: `[BRISPOT] DN ${dnNumber} Melewati Batas Waktu`,
    html: `
      <h2>Notifikasi Keterlambatan Catatan Pemutus (DN)</h2>
      <p>DN <strong>${dnNumber}</strong> atas nama <strong>${debtorName}</strong> telah melewati batas waktu penyelesaian kondisi selama <strong>${daysOverdue} hari kerja</strong>.</p>
      <p>Segera tindaklanjuti melalui sistem BRISPOT.</p>
    `,
  }
}

export function buildDNEscalationEmail(dnNumber: string, debtorName: string) {
  return {
    subject: `[BRISPOT] ESKALASI DN ${dnNumber} ke BOH`,
    html: `
      <h2>Eskalasi Catatan Pemutus (DN) ke BOH</h2>
      <p>DN <strong>${dnNumber}</strong> atas nama <strong>${debtorName}</strong> telah <strong>dieskalasi ke Branch Operation Head (BOH)</strong> karena melebihi batas waktu eskalasi.</p>
    `,
  }
}

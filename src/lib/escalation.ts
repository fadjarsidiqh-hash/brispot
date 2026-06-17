import { createClient } from '@/lib/supabase/server'
import { countWorkingDays, calcEscalationDate, addWorkingDays } from '@/lib/holidays'
import { sendEmail, sendWhatsApp, buildDNOverdueEmail, buildDNEscalationEmail } from '@/lib/notifications'
import { parseISO } from 'date-fns'

/**
 * Run auto-escalation check for all overdue DNs.
 * Intended to be called from a cron API route.
 */
export async function runEscalationCheck(): Promise<void> {
  const supabase = createClient()
  const now = new Date()

  // Get all DNs that are SUBMITTED or DECIDED_BOH and past due_date
  const { data: overdueDNs, error } = await supabase
    .from('decision_notes')
    .select(`
      id, dn_number, debtor_name, due_date, escalation_date, status,
      rm:rm_id(full_name, email, phone),
      adk:adk_id(full_name, email, phone),
      boh:boh_id(full_name, email, phone)
    `)
    .in('status', ['SUBMITTED', 'DECIDED_BOH'])
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString().split('T')[0])

  if (error || !overdueDNs) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const dn of (overdueDNs as any[])) {
    const dueDate = parseISO(dn.due_date!)
    const daysOverdue = await countWorkingDays(dueDate, now)
    const escalationDate = dn.escalation_date
      ? parseISO(dn.escalation_date)
      : await calcEscalationDate(dueDate)

    const shouldEscalate = now >= escalationDate && dn.status !== 'ESCALATED'

    if (shouldEscalate) {
      // Update status to ESCALATED
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('decision_notes')
        .update({ status: 'ESCALATED', escalation_date: escalationDate.toISOString().split('T')[0] })
        .eq('id', dn.id)

      // Audit log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('audit_logs').insert({
        entity_type: 'decision_notes',
        entity_id: dn.id,
        action: 'AUTO_ESCALATED',
        new_values: { status: 'ESCALATED', escalation_date: escalationDate },
      })

      // Notify BOH
      const boh = dn.boh as { full_name: string; email: string; phone?: string } | null
      if (boh?.email) {
        const emailContent = buildDNEscalationEmail(dn.dn_number, dn.debtor_name)
        await sendEmail({ to: boh.email, ...emailContent }).catch(console.error)
        if (boh.phone) {
          await sendWhatsApp({
            target: boh.phone,
            message: `[BRISPOT ESKALASI] DN ${dn.dn_number} - ${dn.debtor_name} dieskalasi ke BOH karena melewati batas waktu.`,
          }).catch(console.error)
        }
      }
    } else {
      // Send overdue reminder to RM
      const rm = dn.rm as { full_name: string; email: string; phone?: string } | null
      if (rm?.email && daysOverdue > 0) {
        const emailContent = buildDNOverdueEmail(dn.dn_number, dn.debtor_name, daysOverdue)
        await sendEmail({ to: rm.email, ...emailContent }).catch(console.error)
      }
    }
  }
}

/**
 * Pengingat SLA tindak lanjut (dn_conditions) otomatis: H-7 / H-3 / H-1
 * dan menandai tindak lanjut yang lewat jatuh tempo sebagai OVERDUE.
 * Dipanggil dari cron route.
 */
export async function runConditionReminders(): Promise<void> {
  const supabase = createClient()
  const today = new Date()
  const ymd = (d: Date) => d.toISOString().split('T')[0]

  // Use working days (skipping weekends + national holidays from the holidays table)
  // so H-7/H-3/H-1 reminders fire exactly 7/3/1 business days before due date.
  const [h7Date, h3Date, h1Date] = await Promise.all([
    addWorkingDays(today, 7),
    addWorkingDays(today, 3),
    addWorkingDays(today, 1),
  ])
  const hMap: Record<string, number> = {
    [ymd(h7Date)]: 7,
    [ymd(h3Date)]: 3,
    [ymd(h1Date)]: 1,
  }

  // Tandai tindak lanjut yang sudah lewat jatuh tempo sebagai OVERDUE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('dn_conditions')
    .update({ status: 'OVERDUE' })
    .lt('due_date', ymd(today))
    .in('status', ['PENDING', 'IN_PROGRESS'])

  // Ambil tindak lanjut yang jatuh tempo di H-7 / H-3 / H-1 dan masih terbuka
  const { data, error } = await supabase
    .from('dn_conditions')
    .select(`
      id, condition_text, due_date, requirement_type, status,
      dn:dn_id(
        dn_number, debtor_name, pic_type,
        rm:rm_id(full_name, email, phone),
        adk:adk_id(full_name, email, phone)
      )
    `)
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .in('due_date', Object.keys(hMap))

  if (error || !data) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (data as any[])) {
    const dn = c.dn
    if (!dn || !c.due_date) continue
    const h = hMap[c.due_date]
    if (!h) continue

    const recipients: { full_name?: string; email?: string; phone?: string }[] = []
    if ((dn.pic_type === 'RM' || dn.pic_type === 'BOTH') && dn.rm) recipients.push(dn.rm)
    if ((dn.pic_type === 'ADK' || dn.pic_type === 'BOTH') && dn.adk) recipients.push(dn.adk)

    const subject = `[BRISPOT] Pengingat Tindak Lanjut H-${h} — DN ${dn.dn_number}`
    const html = `
      <h2>Pengingat Tindak Lanjut (H-${h})</h2>
      <p>Tindak lanjut berikut akan jatuh tempo pada <b>${c.due_date}</b>:</p>
      <ul>
        <li><b>DN:</b> ${dn.dn_number} — ${dn.debtor_name}</li>
        <li><b>Tindak lanjut:</b> ${c.condition_text}</li>
        <li><b>Jenis pemenuhan:</b> ${c.requirement_type === 'EVIDENCE' ? 'Wajib upload bukti' : 'Checklist konfirmasi'}</li>
      </ul>
      <p>Mohon segera diselesaikan sebelum batas waktu.</p>
    `
    for (const r of recipients) {
      if (r?.email) {
        await sendEmail({ to: r.email, subject, html }).catch(console.error)
      }
      if (r?.phone) {
        await sendWhatsApp({
          target: r.phone,
          message: `[BRISPOT] Pengingat (H-${h}): tindak lanjut "${c.condition_text}" pada DN ${dn.dn_number} - ${dn.debtor_name} jatuh tempo ${c.due_date}.`,
        }).catch(console.error)
      }
    }
  }
}

import { createClient } from '@/lib/supabase/server'
import { countWorkingDays, calcEscalationDate } from '@/lib/holidays'
import { sendEmail, sendWhatsApp, buildDNOverdueEmail, buildDNEscalationEmail } from '@/lib/notifications'
import { parseISO } from 'date-fns'

/**
 * Run auto-escalation check for all overdue DNs.
 * Intended to be called from a cron API route.
 */
export async function runEscalationCheck(): Promise<void> {
  const supabase = createClient()
  const now = new Date()

  // Get all DNs that are SUBMITTED or VERIFIED_DK and past due_date
  const { data: overdueDNs, error } = await supabase
    .from('decision_notes')
    .select(`
      id, dn_number, debtor_name, due_date, escalation_date, status,
      ao:ao_id(full_name, email, phone),
      dk:dk_id(full_name, email, phone),
      boh:boh_id(full_name, email, phone)
    `)
    .in('status', ['SUBMITTED', 'VERIFIED_DK'])
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString().split('T')[0])

  if (error || !overdueDNs) return

  for (const dn of overdueDNs) {
    const dueDate = parseISO(dn.due_date!)
    const daysOverdue = await countWorkingDays(dueDate, now)
    const escalationDate = dn.escalation_date
      ? parseISO(dn.escalation_date)
      : await calcEscalationDate(dueDate)

    const shouldEscalate = now >= escalationDate && dn.status !== 'ESCALATED'

    if (shouldEscalate) {
      // Update status to ESCALATED
      await supabase
        .from('decision_notes')
        .update({ status: 'ESCALATED', escalation_date: escalationDate.toISOString().split('T')[0] })
        .eq('id', dn.id)

      // Audit log
      await supabase.from('audit_logs').insert({
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
            message: `[BRIMOS ESKALASI] DN ${dn.dn_number} - ${dn.debtor_name} dieskalasi ke BOH karena melewati batas waktu.`,
          }).catch(console.error)
        }
      }
    } else {
      // Send overdue reminder to AO
      const ao = dn.ao as { full_name: string; email: string; phone?: string } | null
      if (ao?.email && daysOverdue > 0) {
        const emailContent = buildDNOverdueEmail(dn.dn_number, dn.debtor_name, daysOverdue)
        await sendEmail({ to: ao.email, ...emailContent }).catch(console.error)
      }
    }
  }
}

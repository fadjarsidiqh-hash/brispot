import { addDays, isWeekend, isSameDay } from 'date-fns'
import { createClient } from '@/lib/supabase/server'

// In-memory cache for holidays
let cachedHolidays: Date[] | null = null
let cacheYear: number | null = null

async function getHolidays(year: number): Promise<Date[]> {
  if (cachedHolidays && cacheYear === year) return cachedHolidays

  const supabase = createClient()
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('holidays')
    .select('date')
    .gte('date', start)
    .lte('date', end)

  cachedHolidays = ((data ?? []) as Array<{ date: string }>).map((h) => new Date(h.date))
  cacheYear = year
  return cachedHolidays
}

export function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some((h) => isSameDay(h, date))
}

export function isWorkingDay(date: Date, holidays: Date[]): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays)
}

/**
 * Add N working days to a date, skipping weekends and holidays.
 */
export async function addWorkingDays(startDate: Date, days: number): Promise<Date> {
  const holidays = await getHolidays(startDate.getFullYear())
  let current = new Date(startDate)
  let added = 0

  while (added < days) {
    current = addDays(current, 1)
    if (isWorkingDay(current, holidays)) {
      added++
    }
  }
  return current
}

/**
 * Count working days between two dates.
 */
export async function countWorkingDays(from: Date, to: Date): Promise<number> {
  const holidays = await getHolidays(from.getFullYear())
  let count = 0
  let current = new Date(from)

  while (current < to) {
    current = addDays(current, 1)
    if (isWorkingDay(current, holidays)) {
      count++
    }
  }
  return count
}

/**
 * Calculate escalation deadline: 14 working days from due_date.
 */
export async function calcEscalationDate(dueDate: Date): Promise<Date> {
  return addWorkingDays(dueDate, 14)
}

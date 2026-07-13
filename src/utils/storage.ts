export interface ScheduleEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  duration: number;
  course: string;
  institution: string;
  fee: number;
  basePay: number;
  totalFee: number;
}

export function saveEventToLocal(event: Omit<ScheduleEvent, 'id'>) {
  if (typeof window === 'undefined') return;
  const events = getLocalEvents();
  events.push({ ...event, id: Date.now().toString() });
  localStorage.setItem('calendar_events', JSON.stringify(events));
}

export function getLocalEvents(): ScheduleEvent[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('calendar_events');
  return stored ? JSON.parse(stored) : [];
}

export function getMonthlyStats(monthStr: string) { // format 'YYYY-MM'
  const events = getLocalEvents();
  const monthly = events.filter(e => e.date.startsWith(monthStr));
  
  return {
    count: monthly.length,
    totalDuration: monthly.reduce((sum, e) => sum + (e.duration || 0), 0),
    totalFee: monthly.reduce((sum, e) => sum + (e.totalFee || 0), 0)
  };
}

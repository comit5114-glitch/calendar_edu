export interface ScheduleEvent {
  id: string;
  date: string;
  endDate?: string;
  start: string;
  end: string;
  duration: number;
  course: string;
  institution: string;
  fee: number | string;
  basePay: number | string;
  totalFee: number | string;
  repeat?: string;
  notification?: string;
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

export function deleteEventFromLocal(id: string) {
  if (typeof window === 'undefined') return;
  const events = getLocalEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem('calendar_events', JSON.stringify(filtered));
}

export function updateEventInLocal(id: string, updatedEvent: Omit<ScheduleEvent, 'id'>) {
  if (typeof window === 'undefined') return;
  const events = getLocalEvents();
  const index = events.findIndex(e => e.id === id);
  if (index !== -1) {
    events[index] = { ...updatedEvent, id };
    localStorage.setItem('calendar_events', JSON.stringify(events));
  }
}

export function getMonthlyStats(monthStr: string) { // format 'YYYY-MM'
  const events = getLocalEvents();
  const monthly = events.filter(e => e.date.startsWith(monthStr));
  
  return {
    count: monthly.length,
    totalDuration: monthly.reduce((sum, e) => sum + (e.duration || 0), 0),
    totalFee: monthly.reduce((sum, e) => {
      const fee = typeof e.totalFee === 'number' ? e.totalFee : (parseInt(e.totalFee as string) || 0);
      return sum + fee;
    }, 0)
  };
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllCalendarsTodayEvents } from '../../../electron/main/calendar/google-calendar-api';

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({
      calendarList: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              { id: 'primary', summary: 'Primary Calendar', primary: true, accessRole: 'owner' },
              { id: 'work', summary: 'Work Calendar', accessRole: 'reader' },
            ],
          },
        }),
      },
      events: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 'event1',
                summary: 'Team Meeting',
                start: { dateTime: '2024-01-15T10:00:00Z' },
                end: { dateTime: '2024-01-15T11:00:00Z' },
                htmlLink: 'https://calendar.google.com/event1',
              },
            ],
          },
        }),
      },
    })),
  },
}));

describe('Google Calendar API', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {};
    vi.clearAllMocks();
  });

  it('exports getAllCalendarsTodayEvents function', () => {
    expect(getAllCalendarsTodayEvents).toBeDefined();
    expect(typeof getAllCalendarsTodayEvents).toBe('function');
  });

  it('deduplicates the same event returned from multiple calendars', async () => {
    const events = await getAllCalendarsTodayEvents(mockClient);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe('Team Meeting');
  });
});
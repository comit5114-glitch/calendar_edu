import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/utils/googleAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, start, end, course, institution, location } = body;

    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    // 달력 연동 (기본 캘린더 대신, 서비스 계정이 공유받은 사용자 캘린더 ID 사용)
    // 환경변수 GOOGLE_CALENDAR_ID 가 없으면 기본값 'primary' 사용 (단, 서비스계정 자체 캘린더가 됨)
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const [year, month, day] = date.split('-');
    const [sHour, sMin] = start.split(':');
    const [eHour, eMin] = end.split(':');

    const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(sHour), Number(sMin));
    const endDate = new Date(Number(year), Number(month) - 1, Number(day), Number(eHour), Number(eMin));

    const event = {
      summary: `[${institution}] ${course}`,
      location: location,
      description: `기관명: ${institution}\n교육명: ${course}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Seoul',
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    return NextResponse.json({ success: true, eventId: response.data.id });
  } catch (error: any) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

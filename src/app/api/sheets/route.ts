import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/utils/googleAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, course, institution, start, end, duration, fee, basePay, formula, totalFee, dibeSumFormula } = body;

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 스프레드시트 ID (URL에서 d/ 와 /edit 사이의 긴 문자열)
    // 환경변수 GOOGLE_SHEET_ID 로 관리
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: 'GOOGLE_SHEET_ID 환경변수가 없습니다.' }, { status: 400 });
    }

    // 시트에 추가할 데이터 배열 (기본급 포함, J열에 디베 합계 수식)
    const values = [
      [date, institution, course, start, end, `${duration}시간`, fee, basePay, formula || totalFee, dibeSumFormula || '']
    ];

    const resource = {
      values,
    };

    // A열부터 I열까지 데이터 이어붙이기 (Append)
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '시트1!A:J', // 실제 시트 이름에 맞게 수정 (기본값: 시트1)
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    return NextResponse.json({ success: true, updatedRange: response.data.updates?.updatedRange });
  } catch (error: any) {
    console.error('Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

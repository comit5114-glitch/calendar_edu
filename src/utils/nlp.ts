export type Intent = 'REGISTER' | 'SEARCH' | 'UNKNOWN';

export interface ParseResult {
  intent: Intent;
  date?: string; // YYYY-MM-DD
  start?: string; // HH:mm
  end?: string; // HH:mm
  course?: string;
  institution?: string;
  location?: string;
  duration?: number;
  isRecurring?: boolean;
  searchDate?: string;
}

/**
 * 아주 간단한 자체 자연어 분석 (Regex 기반)
 * Gemini API 없이 사용자 음성에서 날짜, 시간, 기관을 추출합니다.
 */
export function parseKoreanVoice(text: string): ParseResult {
  const result: ParseResult = { intent: 'UNKNOWN' };
  
  // 1. 의도(Intent) 파악
  if (text.includes('알려줘') || text.includes('어떻게 돼') || text.includes('검색') || text.includes('무슨 일정')) {
    result.intent = 'SEARCH';
  } else if (text.includes('등록') || text.includes('추가') || text.includes('잡아줘')) {
    result.intent = 'REGISTER';
  } else {
    // 기본값은 REGISTER (시간이나 장소가 있으면)
    result.intent = 'REGISTER';
  }

  // 2. 날짜 추출 (오늘, 내일, 모레, X월 X일)
  const today = new Date();
  let targetDate = new Date();

  if (text.includes('내일')) {
    targetDate.setDate(today.getDate() + 1);
  } else if (text.includes('모레')) {
    targetDate.setDate(today.getDate() + 2);
  } else {
    const dateMatch = text.match(/(\d+)월\s*(\d+)일/);
    if (dateMatch) {
      targetDate.setMonth(parseInt(dateMatch[1], 10) - 1);
      targetDate.setDate(parseInt(dateMatch[2], 10));
    }
  }
  
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  if (result.intent === 'SEARCH') {
    result.searchDate = dateStr;
    return result;
  }

  result.date = dateStr;

  // 3. 시간 추출 (오후 2시, 14시 등)
  let hour = 14; // 기본 14시 (오후 2시)
  const timeMatch = text.match(/(오전|오후)?\s*(\d+)시/);
  if (timeMatch) {
    hour = parseInt(timeMatch[2], 10);
    if (timeMatch[1] === '오후' && hour < 12) {
      hour += 12;
    }
  }
  
  const h = String(hour).padStart(2, '0');
  result.start = `${h}:00`;
  result.end = String(hour + 2).padStart(2, '0') + ':00'; // 기본 2시간
  result.duration = 2;

  // 4. 기관 및 장소 추출 (키워드 매칭)
  if (text.includes('연산4동')) {
    result.institution = '연산4동 행정복지센터';
    result.location = '연산4동 행정복지센터';
  } else if (text.includes('영도구청')) {
    result.institution = '영도구청';
    result.location = '영도구청 평생학습관';
  } else {
    result.institution = '미지정 기관';
    result.location = '미지정 장소';
  }

  // 5. 교육명 추출
  if (text.includes('스마트폰')) {
    result.course = '스마트폰 기초교육';
  } else if (text.includes('키오스크')) {
    result.course = '키오스크 실습';
  } else {
    result.course = '일반 교육';
  }

  result.isRecurring = false;

  return result;
}

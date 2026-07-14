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
  repeat?: string;
  searchDate?: string;
  fee?: number | string;
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

  // 3. 시간 추출 (오후 2시부터 4시까지, 오후 2시, 3시간 등)
  let startHour = 14; // 기본 14시 (오후 2시)
  let endHour = 16;
  
  const rangeMatch = text.match(/(?:오전|오후)?\s*(\d+)시부터\s*(?:오전|오후)?\s*(\d+)시까지/);
  if (rangeMatch) {
    startHour = parseInt(rangeMatch[1], 10);
    endHour = parseInt(rangeMatch[2], 10);
    if (text.includes('오후') && startHour < 12) startHour += 12;
    // 오후 2시부터 4시까지라고 했을 때 4시가 16시임을 유추
    if (endHour < startHour && endHour < 12) endHour += 12; 
  } else {
    const timeMatch = text.match(/(오전|오후)?\s*(\d+)시/);
    if (timeMatch) {
      startHour = parseInt(timeMatch[2], 10);
      if (timeMatch[1] === '오후' && startHour < 12) {
        startHour += 12;
      }
    }
    
    const durationMatch = text.match(/(\d+)시간/);
    if (durationMatch) {
      endHour = startHour + parseInt(durationMatch[1], 10);
    } else {
      endHour = startHour + 2; // 기본 2시간
    }
  }
  
  const hStart = String(startHour).padStart(2, '0');
  const hEnd = String(endHour).padStart(2, '0');
  result.start = `${hStart}:00`;
  result.end = `${hEnd}:00`;
  result.duration = endHour - startHour > 0 ? endHour - startHour : 2;

  // 4. 기관 및 장소 추출 (키워드 매칭 확장)
  const instMatch = text.match(/([가-힣0-9]+(?:동|센터|구청|학교|도서관|복지관|디베))/);
  if (instMatch) {
    result.institution = instMatch[1];
    result.location = instMatch[1];
  } else if (text.includes('디베')) {
    result.institution = '디베';
    result.location = '디베';
  } else {
    result.institution = '미지정 기관';
    result.location = '미지정 장소';
  }

  // 5. 교육명 추출
  const courseMatch = text.match(/([가-힣0-9]+(?:교육|과정|실습|클래스|수업))/);
  if (courseMatch) {
    result.course = courseMatch[1];
  } else if (text.includes('스마트폰')) {
    result.course = '스마트폰 기초교육';
  } else if (text.includes('키오스크')) {
    result.course = '키오스크 실습';
  } else {
    result.course = '일반 교육';
  }

  // 6. 금액 추출 (시간당 XX만원, XX원 등)
  const feeMatch = text.match(/(\d+)(만)?\s*원/);
  if (feeMatch) {
    let amount = parseInt(feeMatch[1], 10);
    if (feeMatch[2] === '만') {
      amount *= 10000;
    } else if (amount < 1000) {
      amount *= 10000; // '3만원'을 '3원'으로 오인식할 경우 대비
    }
    result.fee = amount;
  }

  // 7. 반복 일정 추출
  if (text.includes('매일')) {
    result.repeat = '매일(월-금)';
    result.isRecurring = true;
  } else if (text.includes('매주')) {
    result.repeat = '매주';
    result.isRecurring = true;
  } else if (text.includes('매월')) {
    result.repeat = '매월';
    result.isRecurring = true;
  } else {
    result.repeat = '없음';
    result.isRecurring = false;
  }

  return result;
}

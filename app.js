// 아래 상수에 새로 배포한 GAS 웹 앱 URL을 입력하세요.
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwkG0i68N75PZxVy6SfDOpKK-bWCoruTbFBXOnQuvEQd9bS4u3lWscuEPNdH2ZYWuXP9A/exec';

let calendar;
let currentPendingData = null;
let currentEventId = null;
let recognition = null;
let selectedDatePrefix = "";

/**
 * 백엔드 API 호출 공통 함수 (fetch)
 * CORS Preflight 회피를 위해 text/plain으로 전송
 */
async function callApi(action, payload = {}) {
  if (GAS_API_URL === 'YOUR_GAS_WEB_APP_URL') {
    throw new Error('app.js 파일의 상단에 GAS_API_URL을 입력해주세요.');
  }
  
  const bodyData = { action: action, ...payload };
  
  const response = await fetch(GAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(bodyData)
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'API 오류 발생');
  }
  return result;
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Materialize Components
  M.Sidenav.init(document.querySelectorAll('.sidenav'));
  M.Modal.init(document.querySelectorAll('.modal'), {
    preventScrolling: false
  });

  // Setup Microphone first so calendar can use it
  setupMicrophone();

  // Initialize Calendar
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today'
    },
    events: fetchEvents,
    eventClick: function(info) {
      openEventModal(info.event);
    },
    dateClick: function(info) {
      if (!recognition) {
        M.toast({html: '음성 인식을 지원하지 않는 브라우저입니다.', classes: 'red'});
        return;
      }
      const d = info.date;
      selectedDatePrefix = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 `;
      startRecording();
    },
    height: 'auto'
  });

  // Setup Bottom Navigation Logic
  setupBottomNavigation();

  // Setup Main Mic Button
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      selectedDatePrefix = ""; // Clear context
      startRecording();
    });
  }

  // Setup Buttons
  document.getElementById('calc-btn').addEventListener('click', calculateFees);
  document.getElementById('confirm-save-btn').addEventListener('click', saveEvent);
  document.getElementById('event-delete-btn').addEventListener('click', deleteCurrentEvent);
});

function startRecording() {
  if (!recognition) return;
  const overlay = document.getElementById('voice-overlay');
  const voiceText = document.getElementById('voice-text');
  
  recognition.start();
  overlay.style.display = 'flex';
  voiceText.innerText = selectedDatePrefix ? selectedDatePrefix + ' 일정을 말씀해주세요...' : '말씀해 주세요...';
}

function setupBottomNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('section');

  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active-tab'));
      this.classList.add('active');
      const targetId = this.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active-tab');

      if (targetId === 'tab-schedule') {
        setTimeout(() => calendar.render(), 100);
      }
    });
  });
}

async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  const d = new Date(fetchInfo.start.valueOf() + (fetchInfo.end.valueOf() - fetchInfo.start.valueOf()) / 2);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  
  try {
    const res = await callApi('getEventsForMonth', { year, month });
    successCallback(res.events);
  } catch (err) {
    M.toast({html: '일정 불러오기 실패: ' + err.message, classes: 'red'});
    failureCallback(err);
  }
}

function openEventModal(event) {
  currentEventId = event.id;
  document.getElementById('event-title').innerText = event.title;
  
  let descHtml = '';
  if (event.extendedProps.description) {
    try {
      const descObj = JSON.parse(event.extendedProps.description);
      descHtml = `<b>기관:</b> ${descObj['기관명']}<br><b>교육명:</b> ${descObj['교육명']}<br><b>교육시간:</b> ${descObj['교육시간']}시간<br><b>단가/총액:</b> ${Number(descObj['시간당강사료']).toLocaleString()}원 / ${Number(descObj['총강사료']).toLocaleString()}원<br><b>상태:</b> ${descObj['정산상태']}`;
    } catch(e) {
      descHtml = event.extendedProps.description;
    }
  }
  document.getElementById('event-desc').innerHTML = descHtml || '상세 정보가 없습니다.';
  document.getElementById('event-start').innerText = event.start.toLocaleString();
  document.getElementById('event-end').innerText = event.end ? event.end.toLocaleString() : '';
  
  const inst = M.Modal.getInstance(document.getElementById('event-modal'));
  inst.open();
}

async function deleteCurrentEvent() {
  if (!currentEventId) return;
  const inst = M.Modal.getInstance(document.getElementById('event-modal'));
  inst.close();
  M.toast({html: '일정을 삭제하는 중...'});
  
  try {
    await callApi('deleteEvent', { eventId: currentEventId });
    M.toast({html: '일정이 삭제되었습니다.', classes: 'green'});
    calendar.refetchEvents();
  } catch (err) {
    M.toast({html: '오류: ' + err.message, classes: 'red'});
  }
}

function setupMicrophone() {
  if (!('webkitSpeechRecognition' in window)) return;

  recognition = new webkitSpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = async function(event) {
    const transcript = event.results[0][0].transcript;
    const overlay = document.getElementById('voice-overlay');
    const voiceText = document.getElementById('voice-text');
    
    voiceText.innerText = '인식 완료! AI 분석 중...';
    const finalTranscript = selectedDatePrefix + transcript;
    
    try {
      const data = await callApi('parseVoiceCommand', { text: finalTranscript });
      overlay.style.display = 'none';
      showConfirmModal(data);
    } catch (err) {
      overlay.style.display = 'none';
      M.toast({html: '분석 실패: ' + err.message, classes: 'red'});
    }
  };

  recognition.onerror = function(event) {
    const overlay = document.getElementById('voice-overlay');
    overlay.style.display = 'none';
    if (event.error !== 'no-speech') {
      M.toast({html: '음성 인식 오류: ' + event.error, classes: 'red'});
    }
  };
}

function showConfirmModal(data) {
  currentPendingData = data;
  document.getElementById('conf-date').innerText = data.date;
  document.getElementById('conf-time').innerText = data.start + ' ~ ' + data.end + ' (' + data.duration + '시간)';
  document.getElementById('conf-course').innerText = data.course;
  document.getElementById('conf-inst').innerText = data.institution;
  document.getElementById('conf-loc').innerText = data.location;
  
  const recurRow = document.getElementById('conf-recur-row');
  if (data.isRecurring) {
    recurRow.style.display = 'table-row';
    document.getElementById('conf-recur').innerText = `매주 ${data.recurrenceDay}, 총 ${data.recurrenceCount}회`;
  } else {
    recurRow.style.display = 'none';
  }
  
  document.getElementById('conf-fee-hourly').innerText = data.hourlyFee.toLocaleString();
  document.getElementById('conf-fee-total').innerText = data.totalFee.toLocaleString();
  
  M.Modal.getInstance(document.getElementById('confirm-modal')).open();
}

async function saveEvent() {
  if (!currentPendingData) return;
  const inst = M.Modal.getInstance(document.getElementById('confirm-modal'));
  inst.close();
  M.toast({html: '일정 등록 중...'});
  
  try {
    const res = await callApi('addEvent', { data: currentPendingData });
    M.toast({html: res.message, classes: 'green'});
    calendar.refetchEvents();
  } catch (err) {
    M.toast({html: '오류 발생: ' + err.message, classes: 'red'});
  }
}

async function calculateFees() {
  const currentDate = calendar.getDate();
  const month = currentDate.getMonth() + 1;
  
  if(confirm(`${month}월 캘린더 일정을 스캔하여 강사료를 시트에 기록하시겠습니까?`)) {
    M.toast({html: '강사료 정산 중...'});
    try {
      const res = await callApi('calculateFees', { month: month.toString() });
      M.toast({html: res.message, classes: 'green'});
    } catch (err) {
      M.toast({html: '정산 오류: ' + err.message, classes: 'red'});
    }
  }
}

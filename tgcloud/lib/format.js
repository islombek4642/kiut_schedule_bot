// tgcloud/lib/format.js
// KIUT dars jadvalini para va tanaffuslarga ajratib, HTML formatida chiroyli chiqarish

const DAY_UZ = {
  Monday: 'Dushanba',
  Tuesday: 'Seshanba',
  Wednesday: 'Chorshanba',
  Thursday: 'Payshanba',
  Friday: 'Juma',
  Saturday: 'Shanba',
  Sunday: 'Yakshanba',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_VARIANTS = {
  Monday: ['monday', 'mon', 'dushanba', 'dush', 'понедельник', 'пн'],
  Tuesday: ['tuesday', 'tue', 'seshanba', 'sesh', 'вторник', 'вт'],
  Wednesday: ['wednesday', 'wed', 'chorshanba', 'chor', 'среда', 'ср'],
  Thursday: ['thursday', 'thu', 'payshanba', 'pay', 'четверг', 'чт'],
  Friday: ['friday', 'fri', 'juma', 'jum', 'пятница', 'пт'],
  Saturday: ['saturday', 'sat', 'shanba', 'shan', 'суббота', 'сб'],
  Sunday: ['sunday', 'sun', 'yakshanba', 'yak', 'воскресенье', 'вс'],
};

export function matchesDayName(candidate, targetEnglishDay) {
  if (!candidate || !targetEnglishDay) return false;
  const c = String(candidate).trim().toLowerCase();
  const t = String(targetEnglishDay).trim();
  const variants = DAY_VARIANTS[t] || [t.toLowerCase()];
  return variants.some(v => c === v || c.startsWith(v) || v.startsWith(c));
}

// KIUT rasmiy dars parasi va vaqtlari (har biri 50 daqiqa, 10 daqiqa tanaffus)
export const KIUT_PERIODS = {
  1: { start: '08:00', end: '08:50' },
  2: { start: '09:00', end: '09:50' },
  3: { start: '10:00', end: '10:50' },
  4: { start: '11:00', end: '11:50' },
  5: { start: '12:00', end: '12:50' },
  6: { start: '13:00', end: '13:50' },
  7: { start: '14:00', end: '14:50' },
  8: { start: '15:00', end: '15:50' },
  9: { start: '16:00', end: '16:50' },
  10: { start: '17:00', end: '17:50' },
  11: { start: '18:00', end: '18:50' },
  12: { start: '19:00', end: '19:50' },
};

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getTodayDayName() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tashkentDate = new Date(utcMs + (5 * 3600000));
  const idx = tashkentDate.getDay();
  return DAY_NAMES[idx] || 'Monday';
}

export function getTomorrowDayName() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tashkentTomorrow = new Date(utcMs + (5 * 3600000) + 24 * 3600000);
  const idx = tashkentTomorrow.getDay();
  return DAY_NAMES[idx] || 'Tuesday';
}

export function findPeriodByTime(timeStr, isEnd = false) {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const totalM = h * 60 + m;

  for (const [p, slot] of Object.entries(KIUT_PERIODS)) {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    if (!isEnd && Math.abs(totalM - (sh * 60 + sm)) <= 15) return Number(p);
    if (isEnd && Math.abs(totalM - (eh * 60 + em)) <= 15) return Number(p);
  }
  return null;
}

// Birlashtirilgan darslarni (masalan 12:00-14:50 yoki 5-7 para) har bir 50 daqiqalik alohida darsga ajratish
export function expandLessonToPeriods(lesson) {
  let startP = null;
  let endP = null;

  const rawPeriod = lesson.period || lesson.p_num;
  if (rawPeriod) {
    const match = String(rawPeriod).match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      startP = Number(match[1]);
      endP = match[2] ? Number(match[2]) : startP;
    }
  }

  const rawTime = lesson.t || (lesson.start_time && lesson.end_time ? `${lesson.start_time}-${lesson.end_time}` : '');
  if ((!startP || !endP) && rawTime.includes('-')) {
    const [st, et] = rawTime.split('-').map(s => s.trim());
    if (!startP) startP = findPeriodByTime(st, false);
    if (!endP) endP = findPeriodByTime(et, true);
  }

  if (startP && endP && startP <= endP) {
    const list = [];
    for (let p = startP; p <= endP; p++) {
      const slot = KIUT_PERIODS[p];
      if (!slot) continue;
      list.push({
        ...lesson,
        period: p,
        t: `${slot.start}-${slot.end}`,
        start_time: slot.start,
        end_time: slot.end,
      });
    }
    return list;
  }

  return [lesson];
}

export function expandAllLessons(lessons) {
  const result = [];
  for (const item of lessons || []) {
    result.push(...expandLessonToPeriods(item));
  }
  return result;
}

export function formatDayLessons(dayObj, group = '') {
  const dayEn = dayObj.day || '';
  const dayUz = DAY_UZ[dayEn] || dayEn;
  const rawLessons = dayObj.l || dayObj.lessons || [];
  const lessons = expandAllLessons(rawLessons);
  const safeGroup = escapeHtml(group);

  if (lessons.length === 0) {
    return `📅 <b>${escapeHtml(dayUz)}:</b> Darslar yo'q`;
  }

  let text = `📅 <b>${escapeHtml(dayUz)}</b>${safeGroup ? ` (${safeGroup})` : ''}:\n`;
  for (const item of lessons) {
    const time = escapeHtml(item.t || `${item.start_time}-${item.end_time}`);
    const pLabel = item.period ? `<i>(${item.period}-para)</i>` : '';
    const subject = escapeHtml(item.s || item.subject || "Noma'lum fan");
    const room = escapeHtml(item.r || item.room || '');
    const teacher = escapeHtml(item.p || item.teacher || '');

    text += `\n⏰ <b>${time}</b> ${pLabel} — ${subject}`;
    const meta = [room ? `🏛 ${room}` : '', teacher ? `👤 ${teacher}` : ''].filter(Boolean).join(' | ');
    if (meta) {
      text += `\n   ${meta}`;
    }
  }
  return text;
}

export function formatFullSchedule(data) {
  const group = escapeHtml(data.g || data.group || "Noma'lum guruh");
  const days = data.d || data.days || [];

  if (days.length === 0) {
    return "Jadval ma'lumotlari topilmadi.";
  }

  let out = `🎓 <b>Guruh:</b> ${group}\n`;
  for (const day of days) {
    out += `\n` + formatDayLessons(day);
  }
  return out.trim();
}

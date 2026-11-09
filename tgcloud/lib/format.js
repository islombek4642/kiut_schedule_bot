// tgcloud/lib/format.js
// Dars jadvalini HTML formatida xavfsiz va chiroyli chiqarish

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

export function formatDayLessons(dayObj, group = '') {
  const dayEn = dayObj.day || '';
  const dayUz = DAY_UZ[dayEn] || dayEn;
  const lessons = dayObj.l || dayObj.lessons || [];
  const safeGroup = escapeHtml(group);

  if (lessons.length === 0) {
    return `📅 <b>${escapeHtml(dayUz)}:</b> Darslar yo'q`;
  }

  let text = `📅 <b>${escapeHtml(dayUz)}</b>${safeGroup ? ` (${safeGroup})` : ''}:\n`;
  for (const item of lessons) {
    const time = escapeHtml(item.t || (item.start_time && item.end_time ? `${item.start_time}-${item.end_time}` : item.period || ''));
    const subject = escapeHtml(item.s || item.subject || "Noma'lum fan");
    const room = escapeHtml(item.r || item.room || '');
    const teacher = escapeHtml(item.p || item.teacher || '');

    text += `\n⏰ <b>${time}</b> — ${subject}`;
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

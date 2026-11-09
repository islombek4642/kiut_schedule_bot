// tgcloud/lib/format.js
// Dars jadvalini toza va chiroyli formatda chiqarish

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

export function getTodayDayName() {
  // O'zbekiston vaqti (UTC+5) bo'yicha kunni hisoblash
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

  if (lessons.length === 0) {
    return `📅 *${dayUz}:* Darslar yo'q`;
  }

  let text = `📅 *${dayUz}*${group ? ` (${group})` : ''}:\n`;
  for (const item of lessons) {
    const time = item.t || (item.start_time && item.end_time ? `${item.start_time}-${item.end_time}` : item.period || '');
    const subject = item.s || item.subject || "Noma'lum fan";
    const room = item.r || item.room || '';
    const teacher = item.p || item.teacher || '';

    text += `\n⏰ *${time}* — ${subject}`;
    const meta = [room ? `🏛 ${room}` : '', teacher ? `👤 ${teacher}` : ''].filter(Boolean).join(' | ');
    if (meta) {
      text += `\n   ${meta}`;
    }
  }
  return text;
}

export function formatFullSchedule(data) {
  const group = data.g || data.group || "Noma'lum guruh";
  const days = data.d || data.days || [];

  if (days.length === 0) {
    return "Jadval ma'lumotlari topilmadi.";
  }

  let out = `🎓 *Guruh:* ${group}\n`;
  for (const day of days) {
    out += `\n` + formatDayLessons(day);
  }
  return out.trim();
}

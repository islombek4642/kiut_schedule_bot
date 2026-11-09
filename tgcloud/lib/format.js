// tgcloud/lib/format.js
// Dars jadvalini Telegramda chiroyli matn ko'rinishida formatlash yordamchisi

const DAY_TRANSLATIONS = {
  Monday: 'Dushanba',
  Tuesday: 'Seshanba',
  Wednesday: 'Chorshanba',
  Thursday: 'Payshanba',
  Friday: 'Juma',
  Saturday: 'Shanba',
  Sunday: 'Yakshanba',
};

const DAY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getTodayDayName() {
  const dayIdx = new Date().getDay();
  return DAY_INDEX[dayIdx] || 'Monday';
}

export function formatDayLessons(dayObj) {
  const dayNameEn = dayObj.day || '';
  const dayNameUz = DAY_TRANSLATIONS[dayNameEn] || dayNameEn;

  if (!dayObj.lessons || dayObj.lessons.length === 0) {
    return `📅 *${dayNameUz}:* Darslar yo'q\n`;
  }

  let text = `📅 *${dayNameUz}:*\n`;
  for (const lesson of dayObj.lessons) {
    const time = (lesson.start_time && lesson.end_time) 
      ? `\`${lesson.start_time}-${lesson.end_time}\`` 
      : (lesson.period ? `${lesson.period}-para` : '');
    
    const subject = lesson.subject ? `*${lesson.subject}*` : "Noma'lum fan";
    const room = lesson.room ? `🏛 ${lesson.room}` : '';
    const teacher = lesson.teacher ? `👤 ${lesson.teacher}` : '';
    const type = lesson.type ? `(${lesson.type})` : '';

    const details = [room, teacher, type].filter(Boolean).join(' | ');
    text += `  • ${time} — ${subject}\n`;
    if (details) {
      text += `    ${details}\n`;
    }
  }
  return text;
}

export function formatFullSchedule(schedule) {
  const group = schedule.group || "Noma'lum guruh";
  const semester = schedule.semester ? `\nSemestr: ${schedule.semester}` : '';
  let out = `🎓 *Guruh:* ${group}${semester}\n\n`;

  if (!schedule.days || !Array.isArray(schedule.days) || schedule.days.length === 0) {
    out += "Jadvalda dars kunlari topilmadi.";
    return out;
  }

  for (const d of schedule.days) {
    out += formatDayLessons(d) + '\n';
  }

  return out.trim();
}


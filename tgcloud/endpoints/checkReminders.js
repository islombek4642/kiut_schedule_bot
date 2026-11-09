// tgcloud/endpoints/checkReminders.js
// Dars boshlanishiga 5 daqiqa qolgan talabalarga avtomatik eslatma yuborish (har bir 50 daqiqalik para uchun alohida)

import { api, db } from 'sdk';
import { eq, and, sql } from 'sdk/db';
import { schedules, reminders } from '../schema.js';
import { getTodayDayName, expandAllLessons, escapeHtml } from '../lib/format.js';

export default async function () {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tashkentDate = new Date(utcMs + (5 * 3600000));

  const currentH = tashkentDate.getHours();
  const currentM = tashkentDate.getMinutes();
  const currentTotalM = currentH * 60 + currentM;

  const todayDay = getTodayDayName();
  const dateStr = tashkentDate.toISOString().slice(0, 10);

  const allSchedules = await db.select().from(schedules).all();
  let sentCount = 0;

  for (const row of allSchedules) {
    let scheduleData;
    try {
      scheduleData = JSON.parse(row.scheduleJson);
    } catch (_) {
      continue;
    }

    const days = scheduleData.d || scheduleData.days || [];
    const todayObj = days.find(d => d.day?.toLowerCase() === todayDay.toLowerCase());
    if (!todayObj) continue;

    // Har bir darsni alohida 50 daqiqalik para va tanaffuslarga ajratamiz
    const rawLessons = todayObj.l || todayObj.lessons || [];
    const lessons = expandAllLessons(rawLessons);

    for (const lesson of lessons) {
      const rawTime = lesson.t || (lesson.start_time && lesson.end_time ? `${lesson.start_time}-${lesson.end_time}` : '');
      const startTimeStr = rawTime.includes('-') ? rawTime.split('-')[0].trim() : rawTime.trim();
      if (!startTimeStr.includes(':')) continue;

      const [lh, lm] = startTimeStr.split(':').map(Number);
      if (isNaN(lh) || isNaN(lm)) continue;

      const lessonTotalM = lh * 60 + lm;
      const diff = lessonTotalM - currentTotalM;

      // Dars boshlanishiga 1 dan 6 daqiqagacha qolgan bo'lsa
      if (diff >= 1 && diff <= 6) {
        const subject = lesson.s || lesson.subject || "Noma'lum fan";
        const pNum = lesson.period ? `P${lesson.period}` : startTimeStr;
        const lessonKey = `${dateStr}_${pNum}_${subject}`;

        const alreadySent = await db.select()
          .from(reminders)
          .where(and(eq(reminders.chatId, row.chatId), eq(reminders.lessonKey, lessonKey)))
          .get();

        if (alreadySent) continue;

        const room = (lesson.r || lesson.room) ? `🏛 ${escapeHtml(lesson.r || lesson.room)}` : '';
        const teacher = (lesson.p || lesson.teacher) ? `👤 ${escapeHtml(lesson.p || lesson.teacher)}` : '';
        const meta = [room, teacher].filter(Boolean).join(' | ');
        const pLabel = lesson.period ? `<i>(${lesson.period}-para)</i>` : '';

        const messageText = (
          `🔔 <b>Dars eslatmasi!</b>\n` +
          `Darsingiz <b>${diff} daqiqadan so'ng</b> boshlanadi:\n\n` +
          `⏰ <b>${escapeHtml(rawTime)}</b> ${pLabel} — ${escapeHtml(subject)}` +
          (meta ? `\n   ${meta}` : '')
        );

        try {
          await api.sendMessage({
            chat_id: row.chatId,
            text: messageText,
            parse_mode: 'HTML',
          });

          await db.insert(reminders)
            .values({
              chatId: row.chatId,
              lessonKey: lessonKey,
            })
            .run();

          sentCount++;
        } catch (apiErr) {
          console.warn(`Xabar yuborishda xatolik (chatId: ${row.chatId}):`, apiErr);
        }
      }
    }
  }

  try {
    await db.delete(reminders)
      .where(sql`${reminders.sentAt} < (unixepoch() - 7 * 86400)`)
      .run();
  } catch (_) {}

  return { ok: true, sentCount, checkedAt: tashkentDate.toISOString() };
}

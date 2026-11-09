// tgcloud/handlers/message.js — Telegram 'message' yangilanishlarini qabul qiluvchi handler

import { api, db } from 'sdk';
import { eq, desc, sql } from 'sdk/db';
import { settings, schedules, users } from '../schema.js';
import { extractScheduleWithGroq } from '../lib/groq.js';
import { formatFullSchedule, formatDayLessons, getTodayDayName, getTomorrowDayName } from '../lib/format.js';

const KEYBOARD = {
  keyboard: [
    [{ text: "📅 Bugungi darslar" }, { text: "🌅 Ertangi darslar" }],
    [{ text: "📋 Haftalik jadval" }]
  ],
  resize_keyboard: true,
};

export default async function (message, ctx) {
  const chatId = message.chat.id;
  const fromUser = message.from;

  // 1. Foydalanuvchini bazada yangilash
  if (fromUser) {
    try {
      await db.insert(users)
        .values({
          chatId: chatId,
          firstName: fromUser.first_name || '',
          username: fromUser.username || null,
          requestCount: 0,
        })
        .onConflictDoUpdate({
          target: users.chatId,
          set: {
            firstName: fromUser.first_name || '',
            username: fromUser.username || null,
            lastSeen: sql`(unixepoch())`,
          },
        })
        .run();
    } catch (_) {}
  }

  const text = message.text ? message.text.trim() : '';

  // 2. /start buyrug'i
  if (text === '/start') {
    await api.sendMessage({
      chat_id: chatId,
      text: "Assalomu alaykum!\nDars jadvali rasmini yuboring.",
      reply_markup: KEYBOARD,
    });
    return;
  }

  // 3. Admin uchun maxfiy /setkey buyrug'i
  if (text.startsWith('/setkey')) {
    const parts = text.split(/\s+/);
    if (parts.length >= 2 && parts[1].startsWith('gsk_')) {
      const newKey = parts[1].trim();
      await db.insert(settings)
        .values({ key: 'groq_api_key', value: newKey })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: newKey, updatedAt: sql`(unixepoch())` },
        })
        .run();

      await api.sendMessage({
        chat_id: chatId,
        text: "Kalit yangilandi.",
        reply_markup: KEYBOARD,
      });
      return;
    }
  }

  // 4. "Bugungi darslar" tugmasi
  if (text === '📅 Bugungi darslar' || text === '/today') {
    try {
      const last = await db.select()
        .from(schedules)
        .where(eq(schedules.chatId, chatId))
        .orderBy(desc(schedules.id))
        .limit(1)
        .get();

      if (!last) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Hali dars jadvali yuklanmagan. Iltimos, jadval rasmini yuboring.",
          reply_markup: KEYBOARD,
        });
        return;
      }

      const scheduleData = JSON.parse(last.scheduleJson);
      const today = getTodayDayName();
      const days = scheduleData.d || scheduleData.days || [];
      const todayObj = days.find(d => d.day?.toLowerCase() === today.toLowerCase());

      if (!todayObj || !(todayObj.l || todayObj.lessons)?.length) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Bugun darslar yo'q.",
          reply_markup: KEYBOARD,
        });
        return;
      }

      const formatted = formatDayLessons(todayObj, scheduleData.g || scheduleData.group);
      await api.sendMessage({
        chat_id: chatId,
        text: formatted,
        parse_mode: 'HTML',
        reply_markup: KEYBOARD,
      });
    } catch (e) {
      console.error('/today error:', e);
      await api.sendMessage({
        chat_id: chatId,
        text: "Darslarni yuklashda xatolik yuz berdi.",
        reply_markup: KEYBOARD,
      });
    }
    return;
  }

  // 5. "Ertangi darslar" tugmasi
  if (text === '🌅 Ertangi darslar' || text === '/tomorrow') {
    try {
      const last = await db.select()
        .from(schedules)
        .where(eq(schedules.chatId, chatId))
        .orderBy(desc(schedules.id))
        .limit(1)
        .get();

      if (!last) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Hali dars jadvali yuklanmagan. Iltimos, jadval rasmini yuboring.",
          reply_markup: KEYBOARD,
        });
        return;
      }

      const scheduleData = JSON.parse(last.scheduleJson);
      const tomorrow = getTomorrowDayName();
      const days = scheduleData.d || scheduleData.days || [];
      const tomorrowObj = days.find(d => d.day?.toLowerCase() === tomorrow.toLowerCase());

      if (!tomorrowObj || !(tomorrowObj.l || tomorrowObj.lessons)?.length) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Ertaga darslar yo'q.",
          reply_markup: KEYBOARD,
        });
        return;
      }

      const formatted = formatDayLessons(tomorrowObj, scheduleData.g || scheduleData.group);
      await api.sendMessage({
        chat_id: chatId,
        text: formatted,
        parse_mode: 'HTML',
        reply_markup: KEYBOARD,
      });
    } catch (e) {
      console.error('/tomorrow error:', e);
      await api.sendMessage({
        chat_id: chatId,
        text: "Darslarni yuklashda xatolik yuz berdi.",
        reply_markup: KEYBOARD,
      });
    }
    return;
  }

  // 6. "Haftalik jadval" tugmasi
  if (text === '📋 Haftalik jadval' || text === '/schedule') {
    try {
      const last = await db.select()
        .from(schedules)
        .where(eq(schedules.chatId, chatId))
        .orderBy(desc(schedules.id))
        .limit(1)
        .get();

      if (!last) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Hali dars jadvali yuklanmagan. Iltimos, jadval rasmini yuboring.",
          reply_markup: KEYBOARD,
        });
        return;
      }

      const scheduleData = JSON.parse(last.scheduleJson);
      const formatted = formatFullSchedule(scheduleData);

      await api.sendMessage({
        chat_id: chatId,
        text: formatted,
        parse_mode: 'HTML',
        reply_markup: KEYBOARD,
      });
    } catch (e) {
      console.error('/schedule error:', e);
      await api.sendMessage({
        chat_id: chatId,
        text: "Jadvalni yuklashda xatolik yuz berdi.",
        reply_markup: KEYBOARD,
      });
    }
    return;
  }

  // 7. Faol API kalitini olish
  let activeGroqKey = null;
  try {
    const dbKeyRow = await db.select().from(settings).where(eq(settings.key, 'groq_api_key')).get();
    if (dbKeyRow && dbKeyRow.value) {
      activeGroqKey = dbKeyRow.value;
    }
  } catch (e) {
    console.warn("Baza xatosi:", e);
  }

  // 8. Rasm qabul qilinganda
  let fileIdToProcess = null;
  if (message.photo && message.photo.length > 0) {
    fileIdToProcess = message.photo[message.photo.length - 1].file_id;
  } else if (message.document) {
    const mime = message.document.mime_type || '';
    const name = message.document.file_name || '';
    if (mime.startsWith('image/') || /\.(jpe?g|png)$/i.test(name)) {
      fileIdToProcess = message.document.file_id;
    } else {
      await api.sendMessage({
        chat_id: chatId,
        text: "Iltimos, jadvalni rasm (JPG yoki PNG) formatida yuboring.",
        reply_markup: KEYBOARD,
      });
      return;
    }
  }

  if (fileIdToProcess) {
    if (!activeGroqKey) {
      await api.sendMessage({
        chat_id: chatId,
        text: "Tizim sozlanmagan. Iltimos, administratorga murojaat qiling.",
        reply_markup: KEYBOARD,
      });
      return;
    }

    const statusMsg = await api.sendMessage({
      chat_id: chatId,
      text: "Jadval tahlil qilinmoqda...",
    });

    try {
      const imageBytes = await api.getFileContent(fileIdToProcess);
      const schedule = await extractScheduleWithGroq(imageBytes, activeGroqKey);
      const jsonStr = JSON.stringify(schedule);

      const groupName = schedule.g || schedule.group || "Noma'lum guruh";

      // Eski jadvalni o'chirib, yangisini yozish
      try {
        await db.delete(schedules).where(eq(schedules.chatId, chatId)).run();

        await db.insert(schedules)
          .values({
            chatId: chatId,
            groupName: groupName,
            scheduleJson: jsonStr,
          })
          .run();

        await db.update(users)
          .set({ requestCount: sql`${users.requestCount} + 1` })
          .where(eq(users.chatId, chatId))
          .run();
      } catch (dbErr) {
        console.warn('Bazaga yozishda ogohlantirish:', dbErr);
      }

      // Jadvalni chiroyli matn shaklida yuborish
      const fullText = formatFullSchedule(schedule);

      await api.sendMessage({
        chat_id: chatId,
        text: fullText,
        parse_mode: 'HTML',
        reply_markup: KEYBOARD,
      });

      // Status xabarini tozalash
      try {
        await api.deleteMessage({ chat_id: chatId, message_id: statusMsg.message_id });
      } catch (_) {}

    } catch (err) {
      console.error('Tahlil xatosi:', err);

      await api.editMessageText({
        chat_id: chatId,
        message_id: statusMsg.message_id,
        text: "Rasm sifatli va yorug' olinganini tekshirib, qayta yuboring.",
      });
    }
    return;
  }

  // 9. Boshqa matnli xabarlar
  await api.sendMessage({
    chat_id: chatId,
    text: "Dars jadvali rasmini yuboring yoki quyidagi tugmalardan foydalaning.",
    reply_markup: KEYBOARD,
  });
}

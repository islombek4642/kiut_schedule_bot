// tgcloud/handlers/message.js — Telegram 'message' yangilanishlarini qabul qiluvchi handler

import { api, InputFile, db } from 'sdk';
import { eq, desc, sql } from 'sdk/db';
import { settings, schedules, users } from '../schema.js';
import { extractScheduleWithGroq } from '../lib/groq.js';
import { config } from '../lib/config.js';
import { formatFullSchedule, formatDayLessons, getTodayDayName } from '../lib/format.js';

export default async function (message, ctx) {
  const chatId = message.chat.id;
  const fromUser = message.from;

  // 1. Foydalanuvchini bazada ro'yxatga olish / yangilash
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
    } catch (dbErr) {
      console.warn('Foydalanuvchini yozishda ogohlantirish:', dbErr);
    }
  }

  const text = message.text ? message.text.trim() : '';

  // 2. /start komandasi
  if (text === '/start') {
    await api.sendMessage({
      chat_id: chatId,
      text: (
        "👋 **Assalomu alaykum!**\n\n" +
        "Men **KIUT Schedule Bot**man.\n" +
        "Telegram Serverless va Groq Vision AI (`qwen/qwen3.8-27b`) orqali ishlayman.\n\n" +
        "📋 **Qanday ishlatiladi:**\n" +
        "1. KIUT dars jadvali rasmini (JPG/PNG) yuboring.\n" +
        "2. Bot darslarni, o'qituvchilarni va xonalarni bir necha soniyada tahlil qilib, matnli ko'rinish va `schedule.json` faylini beradi.\n\n" +
        "⚡ **Foydali buyruqlar:**\n" +
        "• `/today` — Bugungi darslarni ko'rish\n" +
        "• `/schedule` — Oxirgi yuklangan to'liq haftalik jadval\n" +
        "• `/help` — Yordam ma'lumoti"
      ),
      parse_mode: 'Markdown',
    });
    return;
  }

  // 3. /help komandasi
  if (text === '/help') {
    await api.sendMessage({
      chat_id: chatId,
      text: (
        "ℹ️ **Botdan foydalanish bo'yicha yordam:**\n\n" +
        "• Dars jadvalini aniq, yaxshi yoritilgan rasm (JPG yoki PNG) sifatida yuboring.\n" +
        "• Bot rasm ichidagi matnlarni Groq LPU orqali tezkor tahlil qiladi.\n" +
        "• Tahlildan so'ng istalgan payt `/today` orqali bugungi darslarni tekshirishingiz mumkin.\n" +
        "• `/schedule` buyrug'i haftalik jadvalni qayta chiqarib beradi."
      ),
      parse_mode: 'Markdown',
    });
    return;
  }

  // 4. /today — Bugungi darslarni ko'rish
  if (text === '/today') {
    try {
      const lastSchedule = await db.select()
        .from(schedules)
        .where(eq(schedules.chatId, chatId))
        .orderBy(desc(schedules.id))
        .limit(1)
        .get();

      if (!lastSchedule) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Siz hali dars jadvali rasmini yubormagansiz. Iltimos, avval jadval rasmini yuboring."
        });
        return;
      }

      const scheduleData = JSON.parse(lastSchedule.scheduleJson);
      const todayDay = getTodayDayName();
      const todayLessons = scheduleData.days?.find(d => d.day?.toLowerCase() === todayDay.toLowerCase());

      if (!todayLessons) {
        await api.sendMessage({
          chat_id: chatId,
          text: `Bugun (${todayDay}) uchun jadvalda darslar topilmadi.`
        });
        return;
      }

      const formatted = formatDayLessons(todayLessons);
      await api.sendMessage({
        chat_id: chatId,
        text: `🎓 *Guruh:* ${scheduleData.group || "Noma'lum"}\n\n${formatted}`,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.error('/today xatosi:', e);
      await api.sendMessage({
        chat_id: chatId,
        text: "Bugungi darslarni yuklashda xatolik yuz berdi."
      });
    }
    return;
  }

  // 5. /schedule — To'liq haftalik jadvalni ko'rish
  if (text === '/schedule') {
    try {
      const lastSchedule = await db.select()
        .from(schedules)
        .where(eq(schedules.chatId, chatId))
        .orderBy(desc(schedules.id))
        .limit(1)
        .get();

      if (!lastSchedule) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Siz hali dars jadvali rasmini yubormagansiz. Iltimos, jadval rasmini yuboring."
        });
        return;
      }

      const scheduleData = JSON.parse(lastSchedule.scheduleJson);
      const formatted = formatFullSchedule(scheduleData);

      await api.sendMessage({
        chat_id: chatId,
        text: formatted,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.error('/schedule xatosi:', e);
      await api.sendMessage({
        chat_id: chatId,
        text: "Jadvalni yuklashda xatolik yuz berdi."
      });
    }
    return;
  }

  // 6. Admin uchun kalit yangilash (/setkey)
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
        text: "✅ Groq API kaliti muvaffaqiyatli yangilandi!"
      });
      return;
    }
  }

  // 7. Faol Groq API kalitini aniqlash (faqat bulutdagi xavfsiz SQLite bazasidan)
  let activeGroqKey = null;
  try {
    const dbKeyRow = await db.select().from(settings).where(eq(settings.key, 'groq_api_key')).get();
    if (dbKeyRow && dbKeyRow.value) {
      activeGroqKey = dbKeyRow.value;
    }
  } catch (e) {
    console.warn("Bazadan kalit o'qishda xatolik:", e);
  }

  // 8. Rasm kelganda (Photo yoki Image Document)
  let fileIdToProcess = null;
  let isImage = false;

  if (message.photo && message.photo.length > 0) {
    fileIdToProcess = message.photo[message.photo.length - 1].file_id;
    isImage = true;
  } else if (message.document) {
    const mime = message.document.mime_type || '';
    const name = message.document.file_name || '';
    if (mime.startsWith('image/') || /\.(jpe?g|png)$/i.test(name)) {
      fileIdToProcess = message.document.file_id;
      isImage = true;
    } else {
      await api.sendMessage({
        chat_id: chatId,
        text: "Iltimos, jadvalni rasm (JPG yoki PNG) formatida yuboring."
      });
      return;
    }
  }

  if (isImage && fileIdToProcess) {
    if (!activeGroqKey) {
      await api.sendMessage({
        chat_id: chatId,
        text: "⚠️ Tizimda Groq API kaliti sozlanmagan. Iltimos, bot administratoriga murojaat qiling."
      });
      return;
    }
    const statusMsg = await api.sendMessage({
      chat_id: chatId,
      text: "⚡ Rasm qabul qilindi. Groq Vision AI orqali tahlil qilinmoqda..."
    });

    try {
      // Telegram serveridan rasm baytlarini yuklab olish
      const imageBytes = await api.getFileContent(fileIdToProcess);

      // Groq Vision orqali tahlil qilish
      const schedule = await extractScheduleWithGroq(imageBytes, activeGroqKey);

      // JSON fayl yaratish
      const jsonStr = JSON.stringify(schedule, null, 2);
      const jsonBytes = new TextEncoder().encode(jsonStr);
      const document = new InputFile(jsonBytes, 'schedule.json', { type: 'application/json' });

      const groupName = schedule.group || "Noma'lum guruh";
      const daysCount = Array.isArray(schedule.days) ? schedule.days.length : 0;

      // Bazaga tahlil natijasini saqlash
      try {
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
        console.warn('Jadvalni bazaga yozishda ogohlantirish:', dbErr);
      }

      // 1. Dastlab jadvalning chiroyli matnli xulosasini yuborish
      const previewText = formatFullSchedule(schedule);
      if (previewText && previewText.length < 4000) {
        await api.sendMessage({
          chat_id: chatId,
          text: previewText,
          parse_mode: 'Markdown'
        });
      }

      // 2. Foydalanuvchiga to'liq JSON faylni yuborish
      await api.sendDocument({
        chat_id: chatId,
        document: document,
        caption: (
          `✅ **Dars jadvali muvaffaqiyatli tahlil qilindi!**\n\n` +
          `📌 **Guruh:** ${groupName}\n` +
          `📅 **Aniqlangan kunlar:** ${daysCount} ta kun\n` +
          `ℹ️ Istalgan payt \`/today\` orqali bugungi darslarni ko'rishingiz mumkin.`
        ),
        parse_mode: 'Markdown',
      });

      // Status xabarini o'chirish
      try {
        await api.deleteMessage({ chat_id: chatId, message_id: statusMsg.message_id });
      } catch (_) {}

    } catch (err) {
      console.error('Jadvalni qayta ishlashda xatolik:', err);

      await api.editMessageText({
        chat_id: chatId,
        message_id: statusMsg.message_id,
        text: (
          `❌ **Xatolik yuz berdi:**\n${err.message}\n\n` +
          `Iltimos, rasm sifatli va yorug' olinganini tekshirib, qayta yuboring.`
        ),
        parse_mode: 'Markdown',
      });
    }
    return;
  }

  // 9. Boshqa matnli xabarlar
  await api.sendMessage({
    chat_id: chatId,
    text: "Iltimos, dars jadvali rasmini (JPG/PNG) yuboring yoki yordam uchun `/help` deb yozing.",
    parse_mode: 'Markdown',
  });
}

// tgcloud/lib/groq.js
// Groq Vision (qwen/qwen3.8-27b) orqali jadvalni o'qish va JSON ga o'girish

import { fetch } from 'sdk';
import { config } from './config.js';
import { uint8ArrayToBase64 } from './util.js';

function normalizeSchedule(parsed) {
  if (Array.isArray(parsed)) {
    const group = parsed[0]?.group || "Noma'lum guruh";
    const dayMap = {};
    for (const item of parsed) {
      const d = item.day || 'Monday';
      if (!dayMap[d]) {
        dayMap[d] = [];
      }
      dayMap[d].push({
        period: item.period || `${item.period_from || ''}-${item.period_to || ''}`,
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        subject: item.subject || '',
        teacher: item.teacher || '',
        room: item.room || '',
        type: item.type || ''
      });
    }
    const days = Object.entries(dayMap).map(([day, lessons]) => ({ day, lessons }));
    return { group, days };
  }

  if (parsed && typeof parsed === 'object') {
    if (!parsed.group && parsed.days?.[0]?.group) {
      parsed.group = parsed.days[0].group;
    }
    if (parsed.schedule && Array.isArray(parsed.schedule)) {
      return normalizeSchedule(parsed.schedule);
    }
    return parsed;
  }

  return parsed;
}

export async function extractScheduleWithGroq(imageBytes, apiKey) {
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY topilmadi.\n" +
      "Iltimos, admin tomonidan API kalit o'rnatilganligini tekshiring."
    );
  }

  const base64Image = uint8ArrayToBase64(imageBytes);

  const systemPrompt = `Siz universitet dars jadvallarini o'qiydigan mukammal AI modelsiz.
Berilgan rasmda KIUT (Kimyo International University in Tashkent) dars jadvali keltirilgan.
Jadvaldagi guruh nomi, haftaning har bir kuni, dars parasi (period), boshlanish va tugash vaqtlari (start_time, end_time), fan nomi (subject), o'qituvchi (teacher), xona (room) va dars turini (type: Lecture yoki Practice) aniq o'qib, FAQAT quyidagi JSON formatida javob qaytaring.

Kutilayotgan JSON formati:
{
  "group": "Guruh nomi (masalan: 75-A)",
  "days": [
    {
      "day": "Monday",
      "lessons": [
        {
          "period": "5-7",
          "start_time": "12:00",
          "end_time": "14:50",
          "subject": "SOFTWARE QUALITY ASSURANCE",
          "teacher": "JO'RAYEV TOXTAMUROD",
          "room": "B-201 Computer room",
          "type": "Lecture"
        }
      ]
    }
  ]
}`;

  const payload = {
    model: config.groqModel || "qwen/qwen3.8-27b",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: systemPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API xatolik qaytardi (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq API bo'sh natija qaytardi.");
  }

  try {
    const rawParsed = JSON.parse(content);
    return normalizeSchedule(rawParsed);
  } catch (parseErr) {
    throw new Error(`Groq javobini JSON formatiga o'tkazib bo'lmadi: ${parseErr.message}`);
  }
}

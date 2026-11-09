// tgcloud/lib/groq.js
// Groq Vision (qwen/qwen3.8-27b) orqali jadvalni ixcham tahlil qilish

import { fetch } from 'sdk';
import { config } from './config.js';
import { uint8ArrayToBase64 } from './util.js';

export async function extractScheduleWithGroq(imageBytes, apiKey) {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY sozlanmagan.");
  }

  const base64Image = uint8ArrayToBase64(imageBytes);

  const prompt = `Extract KIUT university timetable.
CRITICAL: Find real group name/code from top title/header (e.g. ISE_N-23UA, IDE_N-23UA, etc. NOT the room or building address like 75-A).
Return ultra-compact JSON strictly in this structure:
{
  "g": "Group code",
  "d": [
    {
      "day": "Monday",
      "l": [
        {
          "t": "12:00-14:50",
          "s": "Subject name",
          "p": "Teacher name",
          "r": "Room"
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
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
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
    throw new Error(`Groq API xatosi (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Jadvalni o'qib bo'lmadi.");
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error("Jadval ma'lumotlarini o'qishda xatolik yuz berdi.");
  }
}

// tgcloud/endpoints/setAdminKey.js
// Groq API kalitini xavfsiz tarzda bulutdagi SQLite settings jadvaliga yozish

import { db } from 'sdk';
import { sql } from 'sdk/db';
import { settings } from '../schema.js';

export default async function (input) {
  const key = input?.key;
  if (!key || !key.startsWith('gsk_')) {
    throw new Error("Yaroqsiz Groq API kaliti. Kalit 'gsk_' bilan boshlanishi kerak.");
  }

  await db.insert(settings)
    .values({ key: 'groq_api_key', value: key })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: key, updatedAt: sql`(unixepoch())` }
    })
    .run();

  console.log("Groq API kaliti bulutdagi SQLite (settings) jadvaliga muvaffaqiyatli saqlandi!");
  return { success: true, message: "Groq key saved to cloud SQLite!" };
}


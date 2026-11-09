// tgcloud/endpoints/getStats.js
// Bazadagi foydalanuvchilar va yuklangan jadvallar sonini tekshirish

import { db } from 'sdk';
import { schedules, users } from '../schema.js';

export default async function () {
  const userCount = await db.$count(users);
  const scheduleCount = await db.$count(schedules);
  const recentSchedules = await db.select({
    id: schedules.id,
    chatId: schedules.chatId,
    groupName: schedules.groupName,
    createdAt: schedules.createdAt
  })
  .from(schedules)
  .limit(5)
  .all();

  return {
    userCount,
    scheduleCount,
    recentSchedules
  };
}


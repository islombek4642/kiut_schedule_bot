// tgcloud/endpoints/getStats.js
import { db } from 'sdk';
import { schedules, users } from '../schema.js';

export default async function () {
  const allSchedules = await db.select().from(schedules).all();
  return {
    count: allSchedules.length,
    rows: allSchedules.map(r => ({
      id: r.id,
      chatId: r.chatId,
      groupName: r.groupName,
      scheduleJsonLength: r.scheduleJson?.length,
      scheduleJsonPreview: r.scheduleJson?.substring(0, 150)
    }))
  };
}

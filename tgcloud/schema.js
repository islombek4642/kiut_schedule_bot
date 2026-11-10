// tgcloud/schema.js
// SQLite ma'lumotlar bazasi jadvallari

import { table, integer, text, sql } from 'sdk/db';

export const settings = table('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const schedules = table('schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  groupName: text('group_name'),
  scheduleJson: text('schedule_json').notNull(),
  photoFileId: text('photo_file_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const users = table('users', {
  chatId: integer('chat_id').primaryKey(),
  firstName: text('first_name'),
  username: text('username'),
  requestCount: integer('request_count').notNull().default(0),
  lastSeen: integer('last_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const reminders = table('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  lessonKey: text('lesson_key').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

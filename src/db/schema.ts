// src/db/schema.ts

import {
  sqliteTable,
  text,
  integer,
  unique,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text('username').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    usernameIdx: unique('username_idx').on(table.username),
  }),
);

export const boards = sqliteTable(
  'boards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(), // For friendly URLs, e.g., "project-alpha" (enforce unique globally or per-user as needed)
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: unique('slug_idx').on(table.slug), // Optional: global unique slugs for simplicity
  }),
);

export const lists = sqliteTable('lists', {
  // Renamed from "columns" to "lists" for clarity (Trello calls them lists)
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // "Today", "This Week", etc.
  order: integer('order').notNull().default(0), // For drag/drop reordering of lists
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable('tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  listId: text('list_id') // Updated from columnId
    .notNull()
    .references(() => lists.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // Single textarea field for the task (as specified)
  order: integer('order').notNull().default(0), // For drag/drop reordering within list
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => sql`CURRENT_TIMESTAMP`),
});

// Relations for type-safe queries
export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  user: one(users, {
    fields: [boards.userId],
    references: [users.id],
  }),
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, {
    fields: [lists.boardId],
    references: [boards.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  list: one(lists, {
    fields: [tasks.listId],
    references: [lists.id],
  }),
}));

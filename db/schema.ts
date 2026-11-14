import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const cmsDocuments = sqliteTable('cms_documents', {
  path: text('path').primaryKey(), draft: text('draft').notNull(), published: text('published').notNull(),
  version: integer('version').notNull().default(0), publishedVersion: integer('published_version').notNull().default(0),
  updatedAt: text('updated_at').notNull(), publishedAt: text('published_at'),
});
export const cmsRevisions = sqliteTable('cms_revisions', {
  id: text('id').primaryKey(), path: text('path').notNull(), config: text('config').notNull(),
  action: text('action').notNull(), editor: text('editor').notNull(), createdAt: text('created_at').notNull(),
});
export const cmsMedia = sqliteTable('cms_media', {
  id: text('id').primaryKey(), name: text('name').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(), createdAt: text('created_at').notNull(),
});
export const cmsInquiries = sqliteTable('cms_inquiries', {
  id: text('id').primaryKey(), type: text('type').notNull(), email: text('email').notNull(), name: text('name'),
  message: text('message'), createdAt: text('created_at').notNull(),
}, table => [index('cms_inquiries_created_at_idx').on(table.createdAt)]);

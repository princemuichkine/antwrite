import {
  pgTable,
  uuid,
  timestamp,
  text,
  varchar,
  jsonb,
  boolean,
  primaryKey,
  integer,
  pgEnum,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export const chatModeEnum = pgEnum('chat_mode', ['chat', 'agent']);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const Chat = pgTable('Chat', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull(),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  document_context: jsonb('document_context'),
  mode: chatModeEnum('mode').default('chat').notNull(),
});

export type Chat = InferSelectModel<typeof Chat>;

export const Message = pgTable('Message', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => Chat.id),
  role: varchar('role').notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull(),
});

export type Message = InferSelectModel<typeof Message>;

export const artifactKindEnum = pgEnum('artifact_kind', [
  'text',
  'code',
  'image',
  'sheet',
]);

export const documentVisibilityEnum = pgEnum('document_visibility', [
  'public',
  'private',
]);

export const Document = pgTable(
  'Document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' })
      .notNull()
      .$onUpdate(() => new Date()),
    title: text('title').notNull(),
    content: text('content'),
    kind: artifactKindEnum('kind').notNull().default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    chatId: uuid('chatId').references(() => Chat.id),
    is_starred: boolean('is_starred').notNull().default(false),
    visibility: text('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    style: jsonb('style'),
    author: text('author'),
    slug: text('slug'),
    folderId: uuid('folderId').references(() => Folder.id),
  },
  (table) => {
    return {
      userSlugUnique: uniqueIndex('Document_userId_slug_unique').on(
        table.userId,
        table.slug,
      ),
    };
  },
);

export type Document = InferSelectModel<typeof Document>;

export const DocumentVersion = pgTable('DocumentVersion', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('documentId')
    .notNull()
    .references(() => Document.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  content: text('content').notNull(),
  diffContent: text('diff_content'),
  previousVersionId: uuid('previous_version_id').references((): AnyPgColumn => DocumentVersion.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DocumentVersion = InferSelectModel<typeof DocumentVersion>;

export const Folder = pgTable('Folder', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  parentId: uuid('parentId').references((): AnyPgColumn => Folder.id),
});

export type Folder = InferSelectModel<typeof Folder>;

export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull(),
  referenceId: text('reference_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  status: text('status').notNull(),
  periodStart: timestamp('period_start', { mode: 'date' }),
  periodEnd: timestamp('period_end', { mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  seats: integer('seats'),
  trialStart: timestamp('trial_start', { mode: 'date' }),
  trialEnd: timestamp('trial_end', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  documents: many(Document),
  chats: many(Chat),
  subscriptions: many(subscription),
  folders: many(Folder),
}));

export const folderRelations = relations(Folder, ({ one, many }) => ({
  user: one(user, {
    fields: [Folder.userId],
    references: [user.id],
  }),
  parent: one(Folder, {
    fields: [Folder.parentId],
    references: [Folder.id],
    relationName: 'parent_folder',
  }),
  children: many(Folder, {
    relationName: 'parent_folder',
  }),
  documents: many(Document),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const chatRelations = relations(Chat, ({ one, many }) => ({
  user: one(user, {
    fields: [Chat.userId],
    references: [user.id],
  }),
  messages: many(Message),
  documents: many(Document),
}));

export const documentRelations = relations(Document, ({ one, many }) => ({
  user: one(user, {
    fields: [Document.userId],
    references: [user.id],
  }),
  chat: one(Chat, {
    fields: [Document.chatId],
    references: [Chat.id],
  }),
  folder: one(Folder, {
    fields: [Document.folderId],
    references: [Folder.id],
  }),
  versions: many(DocumentVersion),
}));

export const documentVersionRelations = relations(DocumentVersion, ({ one }) => ({
  document: one(Document, {
    fields: [DocumentVersion.documentId],
    references: [Document.id],
  }),
}));

export const messageRelations = relations(Message, ({ one }) => ({
  chat: one(Chat, {
    fields: [Message.chatId],
    references: [Chat.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.referenceId],
    references: [user.id],
  }),
}));

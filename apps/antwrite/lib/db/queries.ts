import 'server-only';
import { db } from '@antwrite/db';
import * as schema from '@antwrite/db';
import { eq, desc, asc, inArray, gt, and, sql, lt } from 'drizzle-orm'; // Import Drizzle operators and
import type { ArtifactKind } from '@/components/artifact';

type Chat = typeof schema.Chat.$inferSelect;
type Message = typeof schema.Message.$inferSelect;
type Document = typeof schema.Document.$inferSelect;
type Folder = typeof schema.Folder.$inferSelect;

interface MessageContent {
  type: 'text' | 'tool_call' | 'tool_result';
  content: any;
  order: number;
}

interface SaveMessageContentParams {
  messageId: string;
  contents: MessageContent[];
}

export async function saveChat({
  id,
  userId,
  title,
  document_context,
}: {
  id: string;
  userId: string;
  title: string;
  document_context?: {
    active?: string;
    mentioned?: string[];
  } | null; // Drizzle expects null for JSONB
}) {
  try {
    await db.insert(schema.Chat).values({
      id,
      userId,
      title,
      createdAt: new Date().toISOString(), // Keep using ISO string if schema expects it
      document_context,
    });
  } catch (error) {
    console.error('Error saving chat:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(schema.Chat).where(eq(schema.Chat.id, id));
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
}

export async function getChatsByUserId({
  id,
}: { id: string }): Promise<Chat[]> {
  try {
    const data = await db
      .select()
      .from(schema.Chat)
      .where(eq(schema.Chat.userId, id))
      .orderBy(desc(schema.Chat.createdAt));
    return data;
  } catch (error) {
    console.error('Error fetching chats by user ID:', error);
    throw error;
  }
}

export async function getChatById({
  id,
}: { id: string }): Promise<Chat | null> {
  try {
    const data = await db
      .select()
      .from(schema.Chat)
      .where(eq(schema.Chat.id, id))
      .limit(1);

    return data[0] || null;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

export async function saveMessages({
  messages,
}: { messages: Array<typeof schema.Message.$inferInsert> }) {
  try {
    const formattedMessages = messages.map((msg) => {
      let finalContent: string | null = null;
      if (typeof msg.content === 'string') {
        finalContent = JSON.stringify([
          { type: 'text', content: msg.content, order: 0 },
        ]);
      } else if (typeof msg.content === 'object' && msg.content !== null) {
        finalContent = JSON.stringify(msg.content);
        finalContent = JSON.stringify(msg.content);
      } else {
        console.warn(
          `[DB Query - saveMessages] Unexpected message content type for msg ID (if exists) ${msg.id}:`,
          typeof msg.content,
        );
        finalContent = JSON.stringify([]);
      }

      return {
        ...msg,
        content: finalContent,
      };
    });

    if (formattedMessages.length > 0) {
      await db.insert(schema.Message).values(formattedMessages);
    } else {
      console.log(
        '[DB Query - saveMessages] No messages to save, skipping db insert',
      );
    }
  } catch (error) {
    console.error('Error saving messages:', error);
    throw error;
  }
}

export async function getMessagesByChatId({
  id,
}: { id: string }): Promise<Message[]> {
  try {
    const data = await db
      .select()
      .from(schema.Message)
      .where(eq(schema.Message.chatId, id))
      .orderBy(asc(schema.Message.createdAt));

    return data.map((message) => {
      let parsedContent: string | object = '';
      try {
        if (message.content) {
          const contentArray =
            typeof message.content === 'string'
              ? JSON.parse(message.content)
              : message.content;

          if (Array.isArray(contentArray) && contentArray.length > 0) {
            const firstElement = contentArray[0];
            if (
              firstElement.type === 'text' &&
              typeof firstElement.content === 'string'
            ) {
              parsedContent = firstElement.content;
            } else {
              parsedContent = contentArray;
            }
          } else if (
            typeof contentArray === 'object' &&
            contentArray !== null
          ) {
            parsedContent = contentArray;
          }
        }
      } catch (e) {
        console.error(
          `[DB Query - getMessagesByChatId] Failed to parse message content for msg ${message.id}:`,
          e,
          'Raw content:',
          message.content,
        );
        parsedContent = '[Error parsing content]';
      }
      return {
        ...message,
        content: parsedContent as any,
      };
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function getMessagesByIds(ids: string[]): Promise<Message[]> {
  if (!ids.length) return [];

  try {
    const data = await db
      .select()
      .from(schema.Message)
      .where(inArray(schema.Message.id, ids));
    return data;
  } catch (error) {
    console.error('Error fetching messages by IDs:', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string | null;
}): Promise<typeof schema.Document.$inferSelect> {
  try {
    const now = new Date();
    const newVersionData = {
      id,
      title,
      kind: kind as (typeof schema.artifactKindEnum.enumValues)[number],
      content,
      userId,
      chatId: chatId || null,
      is_current: true,
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db
      .insert(schema.Document)
      .values(newVersionData)
      .returning();

    console.log(
      `[DB Query - saveDocument] Saved new version for doc ${id}, user ${userId}`,
    );
    if (!inserted || inserted.length === 0) {
      throw new Error(
        'Failed to insert new document version or retrieve the inserted data.',
      );
    }
    return inserted[0];
  } catch (error) {
    console.error(
      `[DB Query - saveDocument] Error saving new version for doc ${id}, user ${userId}:`,
      error,
    );
    throw new Error(
      `Failed to save document version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getDocumentsById({
  ids,
  userId,
}: { ids: string[]; userId: string }): Promise<Document[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    const data = await db
      .select()
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.userId, userId),
          inArray(schema.Document.id, ids),
        ),
      )
      .orderBy(asc(schema.Document.createdAt));
    return data || [];
  } catch (error) {
    console.error('Error fetching documents by IDs:', error);
    return [];
  }
}

export async function getDocumentById({
  id,
}: { id: string }): Promise<Document | null> {
  if (
    !id ||
    id === 'undefined' ||
    id === 'null' ||
    id === 'init' ||
    id === 'current document' ||
    id === 'current document ID' ||
    id === 'current document ID' ||
    id.includes('current')
  ) {
    console.warn(`[DB Query] Invalid document ID provided: ${id}`);
    return null;
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.warn(`[DB Query] Document ID is not a valid UUID format: ${id}`);
    return null;
  }

  try {
    const data = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, id))
      .orderBy(desc(schema.Document.createdAt))
      .limit(1);

    if (!data || data.length === 0) {
      console.warn(`[DB Query] No document found with ID: ${id}`);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error(`[DB Query] Error fetching document with ID ${id}:`, error);
    return null;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: string;
}) {
  try {
    const timestampDate = new Date(timestamp);
    if (Number.isNaN(timestampDate.getTime())) {
      throw new Error('Invalid timestamp provided for deletion.');
    }
    await db
      .delete(schema.Document)
      .where(
        and(
          eq(schema.Document.id, id),
          gt(schema.Document.createdAt, timestampDate),
        ),
      );
  } catch (error) {
    console.error('Error deleting documents:', error);
    throw error;
  }
}

export async function getMessageById({
  id,
}: { id: string }): Promise<Message | null> {
  // Return null if not found
  try {
    const data = await db
      .select()
      .from(schema.Message)
      .where(eq(schema.Message.id, id))
      .limit(1);

    return data[0] || null;
  } catch (error) {
    console.error('Error fetching message by ID:', error);
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: string;
}) {
  try {
    await db
      .delete(schema.Message)
      .where(
        and(
          eq(schema.Message.chatId, chatId),
          gt(schema.Message.createdAt, timestamp),
        ),
      );
  } catch (error) {
    console.error('Error deleting messages:', error);
    throw error;
  }
}

export async function updateChatContextQuery({
  chatId,
  userId,
  context,
}: {
  chatId: string;
  userId: string;
  context: { active?: string; mentioned?: string[] };
}) {
  try {
    await db
      .update(schema.Chat)
      .set({ document_context: context })
      .where(and(eq(schema.Chat.id, chatId), eq(schema.Chat.userId, userId)));
  } catch (error) {
    console.error('Error updating chat context:', error);
    throw error;
  }
}

export async function getCurrentDocumentsByUserId({
  userId,
}: { userId: string }): Promise<
  Pick<
    Document,
    'id' | 'title' | 'createdAt' | 'kind' | 'is_starred' | 'folderId'
  >[]
> {
  try {
    const data = await db
      .select({
        id: schema.Document.id,
        title: schema.Document.title,
        createdAt: schema.Document.createdAt,
        kind: schema.Document.kind,
        is_starred: schema.Document.is_starred,
        folderId: schema.Document.folderId,
      })
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
        ),
      )
      .orderBy(desc(schema.Document.createdAt));
    return data || [];
  } catch (error) {
    console.error('Error fetching current documents by user ID:', error);
    return [];
  }
}

export async function getPaginatedDocumentsByUserId({
  userId,
  limit,
  endingBefore,
}: {
  userId: string;
  limit: number;
  endingBefore: string | null;
}): Promise<{
  documents: Pick<
    Document,
    'id' | 'title' | 'createdAt' | 'kind' | 'is_starred' | 'folderId'
  >[];
  hasMore: boolean;
}> {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: any) =>
      db
        .select({
          id: schema.Document.id,
          title: schema.Document.title,
          createdAt: schema.Document.createdAt,
          kind: schema.Document.kind,
          is_starred: schema.Document.is_starred,
          folderId: schema.Document.folderId,
        })
        .from(schema.Document)
        .where(
          whereCondition
            ? and(
                whereCondition,
                eq(schema.Document.userId, userId),
                eq(schema.Document.is_current, true),
              )
            : and(
                eq(schema.Document.userId, userId),
                eq(schema.Document.is_current, true),
              ),
        )
        .orderBy(desc(schema.Document.createdAt))
        .limit(extendedLimit);

    let paginatedDocs: Pick<
      Document,
      'id' | 'title' | 'createdAt' | 'kind' | 'is_starred' | 'folderId'
    >[] = [];

    if (endingBefore) {
      // Find the cursor document to get its creation date
      const [cursorDoc] = await db
        .select({ createdAt: schema.Document.createdAt })
        .from(schema.Document)
        .where(eq(schema.Document.id, endingBefore))
        .limit(1);

      if (!cursorDoc) {
        // If cursor doesn't exist, maybe return empty or handle error
        return { documents: [], hasMore: false };
      }

      paginatedDocs = await query(
        lt(schema.Document.createdAt, cursorDoc.createdAt),
      );
    } else {
      // First page
      paginatedDocs = await query();
    }

    const hasMore = paginatedDocs.length > extendedLimit - 1;

    return {
      documents: hasMore ? paginatedDocs.slice(0, limit) : paginatedDocs,
      hasMore,
    };
  } catch (error) {
    console.error(
      `[DB Query - getPaginatedDocuments] Error fetching paginated documents for user ${userId}:`,
      error,
    );
    throw error;
  }
}

export async function searchDocumentsByQuery({
  userId,
  query,
  limit = 5,
}: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<Document[]> {
  try {
    const data = await db
      .select()
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
          sql`(${schema.Document.title} ilike ${`%${query}%`} or ${schema.Document.content} ilike ${`%${query}%`})`,
        ),
      )
      .orderBy(desc(schema.Document.createdAt))
      .limit(limit);
    return data || [];
  } catch (error) {
    console.error('Error searching documents by query:', error);
    return [];
  }
}

export async function getCurrentDocumentByTitle({
  userId,
  title,
}: {
  userId: string;
  title: string;
}): Promise<Document | null> {
  try {
    const data = await db
      .select()
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
          sql`${schema.Document.title} ilike ${title}`,
        ),
      )
      .orderBy(desc(schema.Document.createdAt))
      .limit(1);
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching current document by title:', error);
    return null;
  }
}

export async function checkDocumentOwnership({
  userId,
  documentId,
}: {
  userId: string;
  documentId: string;
}): Promise<boolean> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      )
      .limit(1); // Optimization

    return result[0]?.count > 0;
  } catch (error) {
    console.error(
      `[DB Query - checkDocumentOwnership] Error checking ownership for doc ${documentId}, user ${userId}:`,
      error,
    );
    // Assume false on error to be safe
    return false;
  }
}

export async function deleteDocumentByIdAndUserId({
  userId,
  documentId,
}: {
  userId: string;
  documentId: string;
}): Promise<void> {
  try {
    const ownsDocument = await checkDocumentOwnership({ userId, documentId });
    if (!ownsDocument) {
      console.warn(
        `User ${userId} attempted to delete document ${documentId} they don't own.`,
      );
      throw new Error('Unauthorized or document not found');
    }

    await db
      .delete(schema.Document)
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      );
    console.log(
      `Deleted all versions of document ${documentId} for user ${userId}`,
    );
  } catch (error) {
    console.error('Error deleting document by ID and User ID:', error);
    throw error;
  }
}

export async function setOlderVersionsNotCurrent({
  userId,
  documentId,
}: {
  userId: string;
  documentId: string;
}): Promise<void> {
  try {
    await db
      .update(schema.Document)
      .set({ is_current: false })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      );
    console.log(
      `[DB Query - setOlderVersionsNotCurrent] Marked older versions of doc ${documentId} for user ${userId} as not current.`,
    );
  } catch (error) {
    console.error(
      `[DB Query - setOlderVersionsNotCurrent] Error marking older versions for doc ${documentId}, user ${userId}:`,
      error,
    );
    throw new Error(
      `Failed to mark older document versions as not current: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function renameDocumentTitle({
  userId,
  documentId,
  newTitle,
}: {
  userId: string;
  documentId: string;
  newTitle: string;
}): Promise<void> {
  try {
    const ownsDocument = await checkDocumentOwnership({ userId, documentId });
    if (!ownsDocument) {
      console.warn(
        `User ${userId} attempted to rename document ${documentId} they don't own.`,
      );
      throw new Error('Unauthorized or document not found');
    }

    await db
      .update(schema.Document)
      .set({ title: newTitle, updatedAt: new Date() })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      );
    console.log(
      `Renamed document ${documentId} to "${newTitle}" for user ${userId}`,
    );
  } catch (error) {
    console.error('Error renaming document title:', error);
    throw error;
  }
}

export async function getCurrentDocumentVersion({
  userId,
  documentId,
}: {
  userId: string;
  documentId: string;
}): Promise<typeof schema.Document.$inferSelect | null> {
  try {
    const results = await db
      .select()
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
        ),
      )
      .limit(1);

    return results[0] || null;
  } catch (error) {
    console.error(
      `[DB Query - getCurrentDocumentVersion] Error fetching current version for doc ${documentId}, user ${userId}:`,
      error,
    );
    throw new Error(
      `Failed to fetch current document version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function updateCurrentDocumentVersion({
  userId,
  documentId,
  content,
}: {
  userId: string;
  documentId: string;
  content: string;
}): Promise<typeof schema.Document.$inferSelect | null> {
  try {
    const updatedDocs = await db
      .update(schema.Document)
      .set({
        content: content,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
        ),
      )
      .returning();

    if (updatedDocs.length === 0) {
      console.warn(
        `[DB Query - updateCurrentDocumentVersion] No current document found to update for doc ${documentId}, user ${userId}.`,
      );
      const anyVersionExists = await db
        .select({ id: schema.Document.id })
        .from(schema.Document)
        .where(
          and(
            eq(schema.Document.id, documentId),
            eq(schema.Document.userId, userId),
          ),
        )
        .limit(1);
      if (anyVersionExists.length === 0) {
        throw new Error('Document not found or unauthorized.');
      } else {
        throw new Error(
          'Failed to update the current document version. It might have been changed or deleted.',
        );
      }
    }

    console.log(
      `[DB Query - updateCurrentDocumentVersion] Updated content for current version of doc ${documentId}, user ${userId}`,
    );
    return updatedDocs[0];
  } catch (error) {
    console.error(
      `[DB Query - updateCurrentDocumentVersion] Error updating current version for doc ${documentId}, user ${userId}:`,
      error,
    );
    if (
      error instanceof Error &&
      (error.message === 'Document not found or unauthorized.' ||
        error.message.startsWith('Failed to update'))
    ) {
      throw error;
    }
    throw new Error(
      `Failed to update current document version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getChatExists({
  chatId,
}: { chatId: string }): Promise<boolean> {
  try {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!chatId || !uuidRegex.test(chatId)) {
      console.warn(
        `[DB Query - getChatExists] Invalid chat ID format provided: ${chatId}`,
      );
      return false;
    }

    const result = await db
      .select({ id: schema.Chat.id })
      .from(schema.Chat)
      .where(eq(schema.Chat.id, chatId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error(
      `[DB Query - getChatExists] Error checking chat ${chatId}:`,
      error,
    );
    return false;
  }
}

export async function createNewDocumentVersion({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string | null;
}): Promise<typeof schema.Document.$inferSelect> {
  try {
    // Wrap operations in a transaction
    const newDocument = await db.transaction(async (tx) => {
      // 1. Set older versions to not current using the transaction client (tx)
      await tx
        .update(schema.Document)
        .set({ is_current: false })
        .where(
          and(eq(schema.Document.id, id), eq(schema.Document.userId, userId)),
        );
      console.log(
        `[DB Query - TX] Marked older versions of doc ${id} for user ${userId} as not current.`,
      );

      // 2. Prepare and insert the new version using the transaction client (tx)
      const now = new Date();
      const newVersionData = {
        id,
        title,
        kind: kind as (typeof schema.artifactKindEnum.enumValues)[number],
        content,
        userId,
        chatId: chatId || null,
        is_current: true,
        createdAt: now,
        updatedAt: now,
      };
      const inserted = await tx
        .insert(schema.Document)
        .values(newVersionData)
        .returning();

      console.log(
        `[DB Query - TX] Saved new version for doc ${id}, user ${userId}`,
      );
      if (!inserted || inserted.length === 0) {
        throw new Error(
          'Failed to insert new document version or retrieve the inserted data within transaction.',
        );
      }

      // Return the newly inserted document from the transaction
      return inserted[0];
    });

    console.log(
      `[DB Query - createNewDocumentVersion] Successfully created new version for doc ${id}, user ${userId} (Transaction committed)`,
    );
    return newDocument;
  } catch (error) {
    console.error(
      `[DB Query - createNewDocumentVersion] Error creating new version for doc ${id}, user ${userId}:`,
      error,
    );
    // Log if it's a transaction rollback? Drizzle might do this automatically.
    throw new Error(
      `Failed to create new document version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the most recent version of a document by its ID, regardless of is_current status.
 * Useful for fetching the very latest record after an update or creation.
 */
export async function getLatestDocumentById({
  id,
}: { id: string }): Promise<typeof schema.Document.$inferSelect | null> {
  try {
    // Validate document ID
    if (!id || id === 'undefined' || id === 'null' || id === 'init') {
      console.warn(
        `[DB Query - getLatestDocumentById] Invalid document ID provided: ${id}`,
      );
      throw new Error(`Invalid document ID: ${id}`);
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn(
        `[DB Query - getLatestDocumentById] Document ID is not a valid UUID format: ${id}`,
      );
      throw new Error(`Invalid document ID format: ${id}`);
    }

    // Fetch the latest version based on creation time using Drizzle
    const data = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, id))
      .orderBy(desc(schema.Document.createdAt))
      .limit(1);

    if (!data || data.length === 0) {
      // This is okay, might be a new document being created
      console.log(
        `[DB Query - getLatestDocumentById] No document found with ID: ${id}`,
      );
      return null;
    }

    return data[0]; // Return the latest document found
  } catch (error) {
    console.error(
      `[DB Query - getLatestDocumentById] Error fetching document with ID ${id}:`,
      error,
    );
    // Rethrow validation/DB errors specifically
    if (
      error instanceof Error &&
      (error.message.includes('Invalid document ID') ||
        error.message.includes('format'))
    ) {
      throw error;
    }
    // For other errors (like DB connection issues), maybe throw a generic error or return null depending on desired behavior
    // Returning null to align with maybeSingle() behavior in case of non-validation errors
    console.error(
      '[DB Query - getLatestDocumentById] Non-validation error encountered, returning null.',
    );
    return null;
  }
}

// --- Subscription Queries --- //

// Define the type for the subscription based on your schema
type Subscription = typeof schema.subscription.$inferSelect;

/**
 * Fetches the active or trialing subscription for a given user ID.
 * @param userId - The ID of the user.
 * @returns The subscription object or null if none found or error.
 */
export async function getActiveSubscriptionByUserId({
  userId,
}: { userId: string }): Promise<Subscription | null> {
  if (!userId) {
    console.warn(
      '[DB Query - getActiveSubscriptionByUserId] No userId provided.',
    );
    return null;
  }

  try {
    const data = await db
      .select()
      .from(schema.subscription)
      .where(
        and(
          eq(schema.subscription.referenceId, userId),
          inArray(schema.subscription.status, ['active', 'trialing']),
        ),
      )
      .orderBy(desc(schema.subscription.createdAt))
      .limit(1);

    return data[0] || null;
  } catch (error) {
    console.error(
      `[DB Query - getActiveSubscriptionByUserId] Error fetching active subscription for user ${userId}:`,
      error,
    );
    return null;
  }
}

// Add publish settings update
export async function updateDocumentPublishSettings({
  documentId,
  userId,
  visibility,
  author,
  style,
  slug,
}: {
  documentId: string;
  userId: string;
  visibility: 'public' | 'private';
  author: string;
  style: { theme: string; font?: string };
  slug: string;
}): Promise<typeof schema.Document.$inferSelect> {
  return await db.transaction(async (tx) => {
    // prevent slug collision with other documents
    if (slug) {
      const dup = await tx
        .select({ id: schema.Document.id })
        .from(schema.Document)
        .where(
          and(
            eq(schema.Document.userId, userId),
            eq(schema.Document.slug, slug),
            sql`"Document"."id" <> ${documentId}`,
          ),
        )
        .limit(1);

      if (dup.length)
        throw new Error('A document with this name is already published');
    }

    // clear slug on old versions to satisfy unique index
    await tx
      .update(schema.Document)
      .set({ slug: null })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, false),
        ),
      );

    const [result] = await tx
      .update(schema.Document)
      .set({ visibility, author, style, slug })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
        ),
      )
      .returning();

    if (!result) throw new Error('Failed to update publish settings');
    return result;
  });
}

// Add username availability check
export async function checkUsernameAvailability({
  username,
}: { username: string }): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.user)
    .where(eq(schema.user.username, username));
  return Number(count) === 0;
}

// Add set username for a user
export async function setUsername({
  userId,
  username,
}: { userId: string; username: string }): Promise<void> {
  await db
    .update(schema.user)
    .set({ username })
    .where(eq(schema.user.id, userId));
}

export async function clearUsername({
  userId,
}: { userId: string }): Promise<void> {
  await db
    .update(schema.user)
    .set({ username: null })
    .where(eq(schema.user.id, userId));
}

export async function unpublishAllDocumentsByUserId({
  userId,
}: { userId: string }): Promise<void> {
  try {
    const updated = await db
      .update(schema.Document)
      .set({ visibility: 'private', slug: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.Document.userId, userId),
          eq(schema.Document.visibility, 'public'),
        ),
      )
      .returning({ id: schema.Document.id });

    if (updated.length > 0) {
      console.log(
        `[DB Query - unpublishAllDocumentsByUserId] Un-published ${updated.length} documents for user ${userId}.`,
      );
    }
  } catch (error) {
    console.error(
      `[DB Query - unpublishAllDocumentsByUserId] Error un-publishing documents for user ${userId}:`,
      error,
    );
    throw new Error('Failed to un-publish documents.');
  }
}

/**
 * Toggle the starred status of a document
 */
export async function toggleDocumentStar({
  documentId,
  userId,
  isStarred,
}: {
  documentId: string;
  userId: string;
  isStarred: boolean;
}): Promise<void> {
  try {
    const ownsDocument = await checkDocumentOwnership({ userId, documentId });
    if (!ownsDocument) {
      console.warn(
        `User ${userId} attempted to star/unstar document ${documentId} they don't own.`,
      );
      throw new Error('Unauthorized or document not found');
    }

    await db
      .update(schema.Document)
      .set({ is_starred: isStarred, updatedAt: new Date() })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      );

    console.log(
      `${isStarred ? 'Starred' : 'Unstarred'} document ${documentId} for user ${userId}`,
    );
  } catch (error) {
    console.error('Error toggling document star:', error);
    throw error;
  }
}

/**
 * Get starred documents by user ID
 */
export async function getStarredDocumentsByUserId({
  userId,
}: { userId: string }): Promise<
  Pick<Document, 'id' | 'title' | 'createdAt' | 'kind' | 'is_starred'>[]
> {
  try {
    const data = await db
      .select({
        id: schema.Document.id,
        title: schema.Document.title,
        createdAt: schema.Document.createdAt,
        kind: schema.Document.kind,
        is_starred: schema.Document.is_starred,
      })
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.userId, userId),
          eq(schema.Document.is_current, true),
          eq(schema.Document.is_starred, true),
        ),
      )
      .orderBy(desc(schema.Document.createdAt));
    return data || [];
  } catch (error) {
    console.error('Error fetching starred documents by user ID:', error);
    return [];
  }
}

/**
 * Clone a document by creating a new document with the same content
 */
export async function cloneDocument({
  originalDocumentId,
  userId,
  newTitle,
}: {
  originalDocumentId: string;
  userId: string;
  newTitle: string;
}): Promise<typeof schema.Document.$inferSelect> {
  try {
    // First, get the original document
    const originalDoc = await getCurrentDocumentVersion({
      userId,
      documentId: originalDocumentId,
    });

    if (!originalDoc) {
      throw new Error('Original document not found or unauthorized');
    }

    // Create a new document with the same content but different title
    const newDocument = await saveDocument({
      id: crypto.randomUUID(),
      title: newTitle,
      kind: originalDoc.kind as ArtifactKind,
      content: originalDoc.content || '',
      userId,
      chatId: null, // New document not linked to any chat
    });

    console.log(
      `Cloned document ${originalDocumentId} to ${newDocument.id} for user ${userId}`,
    );

    return newDocument;
  } catch (error) {
    console.error('Error cloning document:', error);
    throw error;
  }
}

// --- Folder Queries --- //

export async function createFolder({
  name,
  userId,
  parentId,
}: {
  name: string;
  userId: string;
  parentId?: string | null;
}): Promise<Folder> {
  try {
    const [newFolder] = await db
      .insert(schema.Folder)
      .values({
        name,
        userId,
        parentId,
      })
      .returning();
    return newFolder;
  } catch (error) {
    console.error(
      `[DB Query - createFolder] Error creating folder for user ${userId}:`,
      error,
    );
    throw new Error('Failed to create folder.');
  }
}

export async function getFoldersByUserId({
  userId,
}: {
  userId: string;
}): Promise<Folder[]> {
  try {
    const folders = await db
      .select()
      .from(schema.Folder)
      .where(eq(schema.Folder.userId, userId))
      .orderBy(asc(schema.Folder.name));
    return folders;
  } catch (error) {
    console.error(
      `[DB Query - getFoldersByUserId] Error fetching folders for user ${userId}:`,
      error,
    );
    return [];
  }
}

export async function renameFolder({
  folderId,
  userId,
  newName,
}: {
  folderId: string;
  userId: string;
  newName: string;
}): Promise<void> {
  try {
    await db
      .update(schema.Folder)
      .set({ name: newName, updatedAt: new Date() })
      .where(
        and(eq(schema.Folder.id, folderId), eq(schema.Folder.userId, userId)),
      );
  } catch (error) {
    console.error(
      `[DB Query - renameFolder] Error renaming folder ${folderId} for user ${userId}:`,
      error,
    );
    throw new Error('Failed to rename folder.');
  }
}

export async function deleteFolder({
  folderId,
  userId,
}: {
  folderId: string;
  userId: string;
}): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Set documents' folderId to null
      await tx
        .update(schema.Document)
        .set({ folderId: null })
        .where(
          and(
            eq(schema.Document.folderId, folderId),
            eq(schema.Document.userId, userId),
          ),
        );

      // Delete the folder
      await tx
        .delete(schema.Folder)
        .where(
          and(eq(schema.Folder.id, folderId), eq(schema.Folder.userId, userId)),
        );
    });
  } catch (error) {
    console.error(
      `[DB Query - deleteFolder] Error deleting folder ${folderId} for user ${userId}:`,
      error,
    );
    throw new Error('Failed to delete folder.');
  }
}

export async function moveDocumentToFolder({
  documentId,
  folderId,
  userId,
}: {
  documentId: string;
  folderId: string | null;
  userId: string;
}): Promise<void> {
  try {
    await db
      .update(schema.Document)
      .set({ folderId: folderId, updatedAt: new Date() })
      .where(
        and(
          eq(schema.Document.id, documentId),
          eq(schema.Document.userId, userId),
        ),
      );
  } catch (error) {
    console.error(
      `[DB Query - moveDocumentToFolder] Error moving document ${documentId} for user ${userId}:`,
      error,
    );
    throw new Error('Failed to move document.');
  }
}

export async function cloneFolder({
  folderId,
  userId,
  newFolderName,
}: {
  folderId: string;
  userId: string;
  newFolderName?: string;
}): Promise<Folder> {
  return db.transaction(async (tx) => {
    const originalFolder = await tx.query.Folder.findFirst({
      where: and(
        eq(schema.Folder.id, folderId),
        eq(schema.Folder.userId, userId),
      ),
      with: {
        documents: {
          where: eq(schema.Document.is_current, true),
        },
      },
    });

    if (!originalFolder) {
      throw new Error(
        "Folder not found or you don't have permission to clone it.",
      );
    }

    const newName = newFolderName || `${originalFolder.name} - Copy`;

    const [newFolder] = await tx
      .insert(schema.Folder)
      .values({
        name: newName,
        userId: userId,
        parentId: originalFolder.parentId,
      })
      .returning();

    if (originalFolder.documents && originalFolder.documents.length > 0) {
      const clonedDocumentsData = originalFolder.documents.map((doc) => {
        return {
          id: crypto.randomUUID(), // new ID
          title: doc.title,
          content: doc.content,
          kind: doc.kind,
          userId: doc.userId,
          chatId: null, // do not link to any chat
          is_current: true,
          is_starred: doc.is_starred,
          visibility: 'private' as 'private' | 'public',
          style: doc.style,
          author: doc.author,
          slug: null, // new cloned doc is not published
          folderId: newFolder.id, // new folder id
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      if (clonedDocumentsData.length > 0) {
        await tx.insert(schema.Document).values(clonedDocumentsData);
      }
    }

    return newFolder;
  });
}

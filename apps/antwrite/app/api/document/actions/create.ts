import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // Import Better Auth
import { headers } from 'next/headers'; // Import headers
import {
  saveDocument,
  checkDocumentOwnership,
  getDocumentById,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import type { ArtifactKind } from '@/components/artifact';

/**
 * Handles document creation/update (POST)
 * Creates or updates a document. If the document ID already exists for the user,
 * it will be updated. Otherwise, a new document will be created.
 */
export async function createDocument(request: NextRequest, body: any) {
  try {
    // --- Authentication ---
    const readonlyHeaders = await headers();
    const requestHeaders = new Headers(readonlyHeaders);
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.id) {
      console.warn(
        '[Document API - CREATE] Create request unauthorized - no session',
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // --- Input Validation ---
    const {
      id: providedId,
      title = 'Untitled document', // Default title
      content = '', // Default content
      kind = 'text', // Default kind
      chatId, // Optional chatId
    } = body;

    // Generate a UUID if none provided, otherwise use the provided one
    const documentId = providedId || generateUUID();

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      console.error(
        `[Document API - CREATE] Invalid document ID format: ${documentId}`,
      );
      return NextResponse.json(
        {
          error: `Invalid document ID format. Must be a valid UUID.`,
        },
        { status: 400 },
      );
    }

    console.log(
      `[Document API - CREATE] User ${userId} creating/updating document: ${documentId}`,
    );

    // --- Check Ownership ---
    // Verify the user has permission to create/update this document
    const ownsDocument = await checkDocumentOwnership({
      userId,
      documentId,
    });

    if (ownsDocument) {
      console.log(
        `[Document API - CREATE] User ${userId} owns document ${documentId}, proceeding with update.`,
      );
    } else {
      console.log(
        `[Document API - CREATE] Creating new document ${documentId} for user ${userId}.`,
      );
    }

    // --- Save New Document ---
    await saveDocument({
      id: documentId,
      title: title,
      content: content,
      kind: kind as ArtifactKind,
      userId: userId,
    });

    const newDocumentVersion = await getDocumentById({ id: documentId });

    if (!newDocumentVersion) {
      console.error(
        `[Document API - CREATE] Failed to retrieve document ${documentId} immediately after saving.`,
      );
      return NextResponse.json(
        { error: 'Failed to retrieve created document data.' },
        { status: 500 },
      );
    }

    console.log(
      `[Document API - CREATE] Document version created successfully: ${documentId}`,
    );
    return NextResponse.json(newDocumentVersion);
  } catch (error: any) {
    console.error('[Document API - CREATE] Create error:', error);
    return NextResponse.json(
      {
        error: `Failed to create document: ${error.message || String(error)}`,
      },
      { status: 500 },
    );
  }
}

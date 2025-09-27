import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  updateDocumentContent,
  createDocumentVersion,
  renameDocumentTitle,
} from '@/lib/db/queries';

/**
 * Handles document update operations (POST)
 * Always updates the current document. If `isDebouncedVersion` is true,
 * it ALSO triggers creation of a debounced historical version.
 */
export async function updateDocument(
  request: NextRequest,
  body: any,
): Promise<NextResponse> {
  try {
    // --- Authentication ---
    const readonlyHeaders = await headers();
    const requestHeaders = new Headers(readonlyHeaders);
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.id) {
      console.warn(
        '[Document API - UPDATE] Update request unauthorized - no session',
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // --- Input Validation ---
    const {
      id: documentId,
      content: inputContent = '',
      title: titleUpdate,
      isDebouncedVersion,
      previousContent,
    } = body;

    const content = inputContent;

    console.log(
      `[Document API - UPDATE] User ${userId} updating document: ${documentId}`,
    );
    console.log('[Document API - UPDATE] Received:', {
      id: documentId,
      contentLength: content?.length || 0,
      isDebouncedVersion,
    });

    // Validate ID format (essential before querying)
    if (
      !documentId ||
      documentId === 'undefined' ||
      documentId === 'null' ||
      documentId === 'init'
    ) {
      console.error(
        `[Document API - UPDATE] Invalid document ID: ${documentId}`,
      );
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 },
      );
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      console.error(
        `[Document API - UPDATE] Invalid document ID format: ${documentId}`,
      );
      return NextResponse.json(
        {
          error: `Invalid document ID format. Must be a valid UUID.`,
        },
        { status: 400 },
      );
    }

    // --- Versioning Logic ---
    try {
      console.log(`[Document API - UPDATE] Updating content for ${documentId}`);
      
      const updatePromise = updateDocumentContent({
        userId,
        documentId,
        content,
      });

      // Handle title update if provided (for restore operations)
      const titlePromise = titleUpdate 
        ? renameDocumentTitle({ userId, documentId, newTitle: titleUpdate })
        : Promise.resolve();

      const debouncedPromise = !isDebouncedVersion
        ? Promise.resolve(null)
        : createDocumentVersion({ documentId, content, previousContent })
            .then((v) => {
              if (v) {
                console.log(
                  `[Document API - UPDATE] Successfully created historical version ${v.version} for ${documentId}`
                );
              }
              return v;
            })
            .catch((err) => {
              console.error(
                `[Document API - UPDATE] Historical version creation failed for ${documentId}:`,
                err
              );
              return null;
            });

      const [updatedDocument] = await Promise.all([updatePromise, titlePromise, debouncedPromise]);

      console.log(`[Document API - UPDATE] Document ${documentId} processed successfully.`);
      return NextResponse.json(updatedDocument);
    } catch (dbError: any) {
      console.error(
        `[Document API - UPDATE] Database operation error for doc ${documentId}:`,
        dbError,
      );
      if (dbError.message === 'Document not found or unauthorized.') {
        return NextResponse.json(
          { error: 'Document not found or unauthorized' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          error: `Database operation failed: ${dbError.message || String(dbError)}`,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('[Document API - UPDATE] General update error:', error);
    return NextResponse.json(
      {
        error: `Failed to update document: ${error.message || String(error)}`,
      },
      { status: 500 },
    );
  }
}

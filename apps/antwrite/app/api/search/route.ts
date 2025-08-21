import { type NextRequest, NextResponse } from 'next/server';
import { db, Document, Folder } from '@antwrite/db';
import { and, eq, ilike, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { searchDocumentsByQuery, searchChatsByQuery } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  const readonlyHeaders = await headers();
  const requestHeaders = new Headers(readonlyHeaders);
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type');
  const limit = Number.parseInt(searchParams.get('limit') || '10', 10);

  try {
    let results: any[] = [];

    switch (type) {
      case 'document':
        results = await searchDocumentsByQuery({ userId, query, limit });
        break;
      case 'folder': {
        // Fetch folders and their documents
        const folders = await db
          .select()
          .from(Folder)
          .where(
            and(eq(Folder.userId, userId), ilike(Folder.name, `%${query}%`)),
          )
          .limit(limit);

        const folderIds = folders.map((f) => f.id);
        if (folderIds.length > 0) {
          const documents = await db
            .select()
            .from(Document)
            .where(
              and(
                eq(Document.userId, userId),
                eq(Document.is_current, true),
                inArray(Document.folderId, folderIds),
              ),
            );

          const documentsByFolder = documents.reduce(
            (acc, doc) => {
              if (doc.folderId) {
                if (!acc[doc.folderId]) {
                  acc[doc.folderId] = [];
                }
                acc[doc.folderId].push(doc);
              }
              return acc;
            },
            {} as Record<string, typeof documents>,
          );
          results = folders.map((f) => ({
            ...f,
            documents: documentsByFolder[f.id] || [],
          }));
        } else {
          results = folders;
        }

        break;
      }
      case 'chat':
        results = await searchChatsByQuery({ userId, query, limit });
        break;
      default: {
        // If no type or an invalid type is specified, search across all types
        const allDocuments = await searchDocumentsByQuery({
          userId,
          query,
          limit,
        });
        const allFolders = await db
          .select()
          .from(Folder)
          .where(
            and(eq(Folder.userId, userId), ilike(Folder.name, `%${query}%`)),
          )
          .limit(limit);
        const allChats = await searchChatsByQuery({ userId, query, limit });
        results = [...allDocuments, ...allFolders, ...allChats];
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching search results:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

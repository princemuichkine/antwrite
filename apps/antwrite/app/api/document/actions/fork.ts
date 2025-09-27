import { type NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from 'next/headers';
import { generateUUID } from '@/lib/utils';
import { getAllDocumentVersions } from '@/lib/db/queries';
import { db } from '@antwrite/db';
import * as schema from '@antwrite/db';

interface ForkBody {
  originalDocumentId: string;
  forkFromTimestamp?: string | Date;
  versionIndex?: number;
  newTitle?: string;
}

export async function forkDocument(request: NextRequest, body: any): Promise<NextResponse> {
  try {
    const { originalDocumentId, forkFromTimestamp, versionIndex, newTitle } = body as ForkBody;

    const readonlyHeaders = await headers();
    const session = await auth.api.getSession({ headers: new Headers(readonlyHeaders) });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!originalDocumentId || (forkFromTimestamp === undefined && versionIndex === undefined)) {
      return NextResponse.json({ error: 'Missing fork selector (timestamp or versionIndex)' }, { status: 400 });
    }
    
    const allVersions = await getAllDocumentVersions({ 
      documentId: originalDocumentId, 
      userId: session.user.id 
    });
    
    if (!allVersions.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    let targetVersion;

    if (typeof versionIndex === 'number') {
      targetVersion = allVersions[versionIndex];
    } else if (forkFromTimestamp) {
      targetVersion = allVersions.find(v => {
        const timeDiff = Math.abs(new Date(v.createdAt).getTime() - new Date(forkFromTimestamp).getTime());
        return timeDiff < 1000;
      });
    }
    
    if (!targetVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    const newDocumentId = generateUUID();

    const forkTime = new Date(
      typeof forkFromTimestamp === 'string' ? forkFromTimestamp : targetVersion.createdAt
    ).getTime();

    const versionsUpToFork = allVersions.filter(v => new Date(v.createdAt).getTime() <= forkTime);

    const forkedDoc = await db.transaction(async (tx) => {
      const now = new Date();

      const [doc] = await tx.insert(schema.Document).values({
        id: newDocumentId,
        title: newTitle || `${targetVersion.title} (Fork)`,
        content: targetVersion.content,
        userId: session.user.id,
        chatId: null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      if (versionsUpToFork.length > 0) {
        const versionInserts = versionsUpToFork.map((v, i) => ({
          documentId: newDocumentId,
          content: v.content || '',
          version: i + 1,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt),
        }));
        await tx.insert(schema.DocumentVersion).values(versionInserts);
      }

      return doc;
    });

    return NextResponse.json({ forkedDocument: forkedDoc, newDocumentId });
    
  } catch (error: any) {
    console.error('[Document API - FORK] Error forking document:', error);
    return NextResponse.json({ 
      error: 'Failed to fork document',
      details: error.message,
    }, { status: 500 });
  }
}

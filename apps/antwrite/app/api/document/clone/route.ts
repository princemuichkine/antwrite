import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { cloneDocument } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const readonlyHeaders = await headers();
    const requestHeaders = new Headers(readonlyHeaders);
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, newTitle } = await request.json();

    if (!documentId || !newTitle) {
      return NextResponse.json(
        { error: 'Document ID and new title are required' },
        { status: 400 },
      );
    }

    const clonedDocument = await cloneDocument({
      originalDocumentId: documentId,
      userId: session.user.id,
      newTitle,
    });

    return NextResponse.json({
      success: true,
      document: clonedDocument,
      message: 'Document cloned successfully',
    });
  } catch (error: any) {
    console.error('Error cloning document:', error);

    if (
      error.message.includes('not found') ||
      error.message.includes('unauthorized')
    ) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to clone document' },
      { status: 500 },
    );
  }
}

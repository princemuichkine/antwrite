import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { toggleDocumentStar } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const readonlyHeaders = await headers();
    const requestHeaders = new Headers(readonlyHeaders);
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, isStarred } = await request.json();

    if (!documentId || typeof isStarred !== 'boolean') {
      return NextResponse.json(
        { error: 'Document ID and isStarred boolean are required' },
        { status: 400 },
      );
    }

    await toggleDocumentStar({
      documentId,
      userId: session.user.id,
      isStarred,
    });

    return NextResponse.json({
      success: true,
      message: isStarred ? 'Document starred' : 'Document unstarred',
    });
  } catch (error: any) {
    console.error('Error toggling document star:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to toggle document star' },
      { status: 500 },
    );
  }
}

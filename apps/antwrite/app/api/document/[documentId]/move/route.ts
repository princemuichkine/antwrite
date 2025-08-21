import { getSession } from '@/lib/auth-helpers';
import { moveDocumentToFolder } from '@/lib/db/queries';

export async function POST(
  req: Request,
  { params }: { params: { documentId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { documentId } = params;
    const { folderId } = await req.json();

    await moveDocumentToFolder({
      documentId,
      folderId,
      userId: session.user.id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(
      `[API - POST /api/document/[documentId]/move] Error moving document:`,
      error,
    );
    return new Response('Internal Server Error', { status: 500 });
  }
}

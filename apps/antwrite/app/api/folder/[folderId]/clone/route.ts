import { getSession } from '@/lib/auth-helpers';
import { cloneFolder } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { folderId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { folderId } = params;
    const { newFolderName } = await req.json();
    const newFolder = await cloneFolder({
      folderId,
      userId: session.user.id,
      newFolderName,
    });
    return NextResponse.json(newFolder);
  } catch (error) {
    console.error(
      `[API - POST /api/folder/${params.folderId}/clone] Error cloning folder:`,
      error,
    );
    return new Response('Internal Server Error', { status: 500 });
  }
}

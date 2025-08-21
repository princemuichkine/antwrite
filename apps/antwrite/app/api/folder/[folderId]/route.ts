import { getSession } from '@/lib/auth-helpers';
import { deleteFolder, renameFolder } from '@/lib/db/queries';

export async function DELETE(
  req: Request,
  { params }: { params: { folderId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { folderId } = params;
    await deleteFolder({ folderId, userId: session.user.id });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(
      `[API - DELETE /api/folder/${params.folderId}] Error deleting folder:`,
      error,
    );
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { folderId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { folderId } = params;
    const { newName } = await req.json();

    if (!newName) {
      return new Response('New folder name is required', { status: 400 });
    }

    await renameFolder({ folderId, userId: session.user.id, newName });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(
      `[API - PUT /api/folder/${params.folderId}] Error renaming folder:`,
      error,
    );
    return new Response('Internal Server Error', { status: 500 });
  }
}

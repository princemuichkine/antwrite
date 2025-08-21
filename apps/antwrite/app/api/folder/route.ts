import { getSession } from '@/lib/auth-helpers';
import { createFolder, getFoldersByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const folders = await getFoldersByUserId({ userId: session.user.id });
    return NextResponse.json(folders);
  } catch (error) {
    console.error('[API - GET /api/folder] Error fetching folders:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { name, parentId } = await req.json();
    if (!name) {
      return new Response('Folder name is required', { status: 400 });
    }

    const newFolder = await createFolder({
      name,
      parentId,
      userId: session.user.id,
    });
    return NextResponse.json(newFolder);
  } catch (error) {
    console.error('[API - POST /api/folder] Error creating folder:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

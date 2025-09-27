import type { NextRequest } from 'next/server';
import { createDocument } from './actions/create';
import { updateDocument } from './actions/update';
import { deleteDocument } from './actions/delete';
import { getDocuments } from './actions/get';
import { renameDocument } from './actions/rename';
import { forkDocument } from './actions/fork';

// All document related actions are handled here
export async function GET(request: NextRequest) {
  return getDocuments(request);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  return createDocument(request, body);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === 'fork') {
    console.log('[Document API] Detected fork operation');
    return forkDocument(request, body);
  }

  if (body.id && body.title && body.content === undefined && !body.kind && !body.chatId) {
    console.log('[Document API] Detected rename operation');
    return renameDocument(request, body);
  }

  return updateDocument(request, body);
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  return deleteDocument(request, body);
}

import { notFound } from 'next/navigation';
import { AlwaysVisibleArtifact } from '@/components/always-visible-artifact';
import { getDocumentsById } from '@/lib/db/queries';
import type { Document } from '@antwrite/db';
import { getUser } from '@/lib/auth-helpers';

type DocumentPageProps = {
  params: {
    id: string;
  };
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const documentId = params.id;

  const user = await getUser();
  if (!user) {
    console.warn(`[DocumentPage] User not found. Redirecting.`);
    return notFound();
  }

  let documents: Array<Document> = [];
  try {
    documents = await getDocumentsById({
      ids: [documentId],
      userId: user.id,
    });
  } catch (error) {
    console.error('[DocumentPage] Error fetching document:', error);
    // Treat as not found
  }

  if (!documents || documents.length === 0) {
    return (
      <AlwaysVisibleArtifact
        chatId={documentId}
        initialDocumentId="init"
        initialDocuments={[]}
        showCreateDocumentForId={documentId}
        user={user}
      />
    );
  }

  return (
    <AlwaysVisibleArtifact
      chatId={documentId}
      initialDocumentId={documentId}
      initialDocuments={documents}
      user={user}
    />
  );
}

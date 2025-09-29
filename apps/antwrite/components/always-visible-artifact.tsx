'use client';

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  useTransition,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Document } from '@antwrite/db';
import { generateUUID } from '@/lib/utils';
import { useArtifact } from '@/hooks/use-artifact';
// import { ArtifactActions } from '@/components/artifact-actions';
import { VersionHeader } from '@/components/document/version-header';
import { useDocumentUtils } from '@/hooks/use-document-utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { Input } from './ui/input';
import { useDocumentContext } from '@/hooks/use-document-context';
import type { ArtifactKind } from '@/components/artifact';
import { AiSettingsMenu } from './ai-settings-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { SaveState } from '@/lib/editor/save-plugin';
import type { User } from '@/lib/auth';
import { PublishSettingsMenu } from '@/components/publish-settings-menu';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveEditorView } from '@/lib/editor/editor-state';
import { TextSelection } from 'prosemirror-state';
import { useDocumentVersions } from '@/hooks/use-document-versions';
import { VersionRail } from '@/components/document/version-rail';
import { DocumentActions } from './document/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ZOOM_LEVELS } from '@/lib/utils/zoom';

const Editor = dynamic(
  () => import('@/components/document/text-editor').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  },
);

const EditorSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-6 bg-muted rounded-sm w-3/4" />
    <div className="h-4 bg-muted rounded-sm w-full" />
    <div className="h-4 bg-muted rounded-sm w-5/6" />
    <div className="h-4 bg-muted rounded-sm w-full" />
    <div className="h-4 bg-muted rounded-sm w-1/2" />
  </div>
);

type AlwaysVisibleArtifactProps = {
  chatId: string;
  initialDocumentId: string;
  initialDocuments: Document[];
  showCreateDocumentForId?: string;
  user: User;
};

type SettableArtifact = {
  documentId: string;
  title: string;
  content: string;
  kind: ArtifactKind;
  status: 'idle' | 'loading' | 'streaming';
  isVisible?: boolean;
  boundingBox?: any;
};

const defaultArtifactProps = {
  isVisible: false,
  boundingBox: undefined,
};

export function AlwaysVisibleArtifact({
  chatId,
  initialDocumentId,
  initialDocuments = [],
  showCreateDocumentForId,
  user,
}: AlwaysVisibleArtifactProps) {
  const router = useRouter();
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const { documentId: contextDocumentId } = useDocumentContext();
  const {
    isCreatingDocument,
    renameDocument,
    isRenamingDocument,
    createDocument,
  } = useDocumentUtils();

  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'idle'>('idle');
  const [zoom, setZoom] = useState('1');

  const { versions, isLoading: versionsLoading, mutate: mutateVersions, refresh: refreshVersions } = useDocumentVersions(initialDocumentId, user?.id);

  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);

  // When the component mounts or the document ID changes, sync the artifact context.
  useEffect(() => {
    if (initialDocumentId && initialDocumentId !== 'init' && initialDocumentId !== artifact.documentId) {
      const doc = initialDocuments.find(d => d.id === initialDocumentId);
      setArtifact(prev => ({
        ...prev,
        documentId: initialDocumentId,
        title: doc?.title || '',
        content: doc?.content || '',
        kind: (doc?.kind as ArtifactKind) || 'text',
      }));
    }
  }, [initialDocumentId, initialDocuments, artifact.documentId, setArtifact]);

  // Update documents state when versions are loaded
  useEffect(() => {
    if (versions && versions.length > 0) {
      // Map version data to document format for compatibility
      const mappedVersions: Document[] = versions.map((version) => ({
        id: version.id,
        title: version.title,
        content: version.content,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        // Use default values for missing Document properties
        kind: 'text' as const,
        userId: user?.id || '',
        chatId: null,
        is_starred: false,
        visibility: 'private' as const,
        style: null,
        author: null,
        slug: null,
        folderId: null,
      }));
      setDocuments(mappedVersions);
      setCurrentVersionIndex(versions.length - 1);
    }
  }, [versions, user?.id]);

  const currentDocument = useMemo(() => {
    if (currentVersionIndex >= 0 && currentVersionIndex < documents.length) {
      return documents[currentVersionIndex];
    }
    return null;
  }, [documents, currentVersionIndex]);

  const latestDocument = useMemo(() => {
    if (documents && documents.length > 0) {
      return documents[documents.length - 1];
    }
    return null;
  }, [documents]);

  useEffect(() => {
    startTransition(() => {
      const docToUse = documents[currentVersionIndex];
      if (docToUse) {
        setArtifact((prev) => ({
          ...prev,
          documentId: docToUse.id,
          title: docToUse.title,
          content: docToUse.content ?? '',
          kind: 'text' as ArtifactKind, // Version data doesn't include kind, default to text
          status: 'idle',
        }));
        setNewTitle(docToUse.title);
      } else if (initialDocumentId === 'init' || showCreateDocumentForId) {
        const initData: SettableArtifact = {
          ...defaultArtifactProps,
          documentId: 'init',
          title: 'Document',
          content: '',
          kind: 'text' as ArtifactKind,
          status: 'idle',
        };
        setArtifact(initData as any);
        setNewTitle(initData.title);
      }
    });
  }, [
    initialDocumentId,
    setArtifact,
    startTransition,
    showCreateDocumentForId,
    documents,
    currentVersionIndex,
  ]);

  useEffect(() => {
    const handleDocumentRenamed = (event: CustomEvent) => {
      if (!event.detail) return;
      const { documentId: renamedDocId, newTitle: updatedTitle } = event.detail;

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === renamedDocId ? { ...doc, title: updatedTitle } : doc,
        ),
      );

      if (renamedDocId === artifact.documentId) {
        setArtifact((current) => ({
          ...current,
          title: updatedTitle,
        }));
        if (editingTitle && newTitle !== updatedTitle) {
          setNewTitle(updatedTitle);
        }
      }
    };

    const handleVersionFork = async (event: CustomEvent) => {
      const { originalDocumentId, versionIndex, forkFromTimestamp } = event.detail;

      if (originalDocumentId !== artifact.documentId) return;


      try {
        // Get the current document title for naming the fork
        const currentDoc = documents[documents.length - 1];
        const forkTitle = `${currentDoc?.title || 'Document'} (Fork)`;

        const response = await fetch('/api/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fork',
            originalDocumentId,
            forkFromTimestamp,
            versionIndex,
            newTitle: forkTitle,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Fork failed: ${errorData.error || response.statusText}`);
        }

        const forkResult = await response.json();

        // Navigate to the new forked document
        toast({
          description: `Forked to new document: ${forkTitle}`
        });
        const newId = forkResult.newDocumentId ?? forkResult.documentId ?? forkResult.id;
        router.push(`/documents/${newId}`);

      } catch (error: any) {
        console.error('[DocumentWorkspace] Version fork failed:', error);
        toast({
          type: 'error',
          description: `Failed to fork document: ${error.message}`
        });
      }
    };

    window.addEventListener(
      'document-renamed',
      handleDocumentRenamed as EventListener,
    );
    window.addEventListener('version-fork', handleVersionFork as unknown as EventListener);

    return () => {
      window.removeEventListener(
        'document-renamed',
        handleDocumentRenamed as EventListener,
      );
      window.removeEventListener('version-fork', handleVersionFork as unknown as EventListener);
    }
  }, [artifact.documentId, editingTitle, newTitle, setArtifact, documents, router]);

  // Focus editor when document changes or component mounts
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout | undefined;
    let retryCount = 0;
    const maxRetries = 10;

    const focusEditor = () => {
      const editorView = getActiveEditorView();

      if (!editorView && retryCount < maxRetries) {
        retryCount++;
        focusTimeout = setTimeout(focusEditor, 100);
        return;
      }

      if (!editorView) {
        console.warn(
          'AlwaysVisibleArtifact: Failed to find editor view after maximum retries',
        );
        return;
      }

      try {
        // Check if this is a new/empty document that needs cursor positioning
        const isEmptyDocument =
          !artifact.content || artifact.content.trim() === '';
        const isNewDocument =
          artifact.documentId !== 'init' &&
          (!latestDocument || isEmptyDocument);

        if (isNewDocument || isEmptyDocument) {
          // Position cursor at start for new/empty documents
          const resolvedPos = editorView.state.doc.resolve(0);
          const selection = TextSelection.near(resolvedPos);
          const tr = editorView.state.tr.setSelection(selection);

          editorView.focus();
          editorView.dispatch(tr);
        } else {
          // Position cursor at end for existing documents with content
          const endPos = editorView.state.doc.content.size;
          const resolvedPos = editorView.state.doc.resolve(endPos);
          const selection = TextSelection.near(resolvedPos);
          const tr = editorView.state.tr.setSelection(selection);

          editorView.focus();
          editorView.dispatch(tr);
        }
      } catch (error) {
        console.warn('AlwaysVisibleArtifact: Error focusing editor', error);
        // Fallback: just try to focus without cursor positioning
        try {
          editorView.focus();
        } catch (fallbackError) {
          console.warn(
            'AlwaysVisibleArtifact: Even focus fallback failed',
            fallbackError,
          );
        }
      }
    };

    // Clear any existing timeout and start fresh
    if (focusTimeout) {
      clearTimeout(focusTimeout);
    }

    // Single attempt to focus after a short delay to ensure editor is ready
    focusTimeout = setTimeout(focusEditor, 150);

    // Cleanup function to clear timeout when effect re-runs
    return () => {
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [artifact.documentId, artifact.content, artifact.title, latestDocument]);

  const handleDocumentUpdate = (updatedFields: Partial<Document>) => {
    // Only update if we have version data loaded
    if (documents.length > 0) {
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => {
          if (doc.id === updatedFields.id) {
            return {
              ...doc,
              title: updatedFields.title ?? doc.title,
              content: updatedFields.content !== undefined ? updatedFields.content : doc.content,
            };
          }
          return doc;
        }),
      );
    }
    if (artifact.documentId === updatedFields.id) {
      const { kind, ...otherUpdatedFields } = updatedFields;
      setArtifact((current) => ({
        ...current,
        ...otherUpdatedFields,
        content:
          updatedFields.content !== undefined
            ? (updatedFields.content ?? '')
            : current.content,
        ...(kind && { kind: kind as any }),
      }));
    }
  };

  const handleEditTitle = useCallback(() => {
    if (!latestDocument) return;
    setNewTitle(latestDocument.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [latestDocument]);

  const handleSaveTitle = useCallback(async () => {
    if (!latestDocument) return;
    const trimmedNewTitle = newTitle.trim();
    if (trimmedNewTitle && trimmedNewTitle !== latestDocument.title) {
      const originalTitle = latestDocument.title;
      const originalDocuments = [...documents];

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === latestDocument.id
            ? { ...doc, title: trimmedNewTitle }
            : doc,
        ),
      );

      try {
        await renameDocument(trimmedNewTitle);
      } catch (error) {
        toast({
          type: 'error',
          description: 'Failed to rename document.',
        });
        setDocuments(originalDocuments);
        console.error('Rename failed:', error);
      } finally {
        setEditingTitle(false);
      }
    } else {
      setEditingTitle(false);
      if (!trimmedNewTitle) setNewTitle(latestDocument.title);
    }
  }, [newTitle, latestDocument, documents, renameDocument]);

  const handleCancelEditTitle = useCallback(() => {
    if (!latestDocument) return;
    setEditingTitle(false);
    setNewTitle(latestDocument.title);
  }, [latestDocument]);

  const handleVersionChangeByIndex = useCallback((index: number) => {
    if (index < 0 || index >= documents.length) return;
    setCurrentVersionIndex(index);
    setMode(index === documents.length - 1 ? 'edit' : 'diff');
  }, [documents.length]);

  const handleVersionChange = useCallback(
    (type: 'next' | 'prev' | 'toggle' | 'latest') => {
      if (
        documents.length <= 1 &&
        (type === 'next' || type === 'prev' || type === 'toggle')
      )
        return;

      startTransition(() => {
        if (type === 'latest') {
          setCurrentVersionIndex(documents.length - 1);
          setMode('edit');
          return;
        }

        if (type === 'toggle') {
          const nextMode = mode === 'edit' ? 'diff' : 'edit';
          setMode(nextMode);
          if (nextMode === 'edit') {
            setCurrentVersionIndex(documents.length - 1);
          }
          return;
        }

        setMode('diff');
        if (type === 'prev') {
          setCurrentVersionIndex((index) => Math.max(0, index - 1));
        } else if (type === 'next') {
          setCurrentVersionIndex((index) =>
            Math.min(documents.length - 1, index + 1),
          );
        }
      });
    },
    [documents, mode, startTransition],
  );

  const getContentForVersion = useCallback(
    (index: number): string => {
      if (!documents || index < 0 || index >= documents.length) return '';
      return documents[index].content ?? '';
    },
    [documents],
  );

  const handleCreateDocumentWithId = useCallback(
    async (id: string) => {
      if (isCreatingDocument) return;
      try {
        await createDocument({
          title: 'Untitled document',
          content: '',
          kind: 'text',
          chatId: null,
          navigateAfterCreate: true,
          providedId: id,
        });
      } catch (error) {
        console.error('Error creating document with specific ID:', error);
        toast({
          type: 'error',
          description: 'Failed to create document',
        });
      }
    },
    [isCreatingDocument, createDocument],
  );

  const handleCreateDocumentFromEditor = useCallback(
    async (initialContent: string) => {
      if (isCreatingDocument || initialDocumentId !== 'init') return;
      const newDocId = generateUUID();
      try {
        await createDocument({
          title: 'Untitled document',
          content: initialContent,
          kind: 'text',
          chatId: null,
          navigateAfterCreate: true,
          providedId: newDocId,
        });
      } catch (error) {
        console.error('Error creating document from editor:', error);
        toast({
          type: 'error',
          description: 'Failed to create document',
        });
      }
    },
    [isCreatingDocument, initialDocumentId, createDocument],
  );

  const handleStatusChange = useCallback((newSaveState: SaveState) => {
    setSaveStatus(newSaveState.status === 'saving' ? 'saving' : 'idle');
  }, []);

  const handleZoomChange = useCallback((value: string) => {
    setZoom(value);
  }, []);

  const isCurrentVersion = useMemo(
    () => currentVersionIndex === documents.length - 1,
    [currentVersionIndex, documents],
  );

  const editorContent = useMemo(() => {
    if (initialDocumentId === 'init' && !showCreateDocumentForId) {
      return '';
    }
    if (documents.length === 0 && !showCreateDocumentForId) {
      return '';
    }
    return getContentForVersion(currentVersionIndex);
  }, [
    initialDocumentId,
    documents,
    currentVersionIndex,
    showCreateDocumentForId,
    getContentForVersion,
  ]);

  const editorDocumentId = useMemo(() => {
    if (showCreateDocumentForId) return 'init';
    return latestDocument?.id ?? 'init';
  }, [showCreateDocumentForId, latestDocument]);

  if (showCreateDocumentForId) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="flex justify-between items-center border-b px-3 h-[45px]">
          <SidebarTrigger />
        </div>

        <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-muted-foreground">
          {/* Mini preview card */}
          <Card className="w-44 h-32 sm:w-52 sm:h-36 md:w-56 md:h-40 border border-border shadow-sm overflow-hidden bg-background">
            <div className="h-5 bg-muted flex items-center px-2 text-[9px] text-muted-foreground/80 font-mono gap-1">
              <Skeleton className="h-2.5 w-3/5" />
            </div>
            <div className="p-3 space-y-1">
              <Skeleton className="h-2.5 w-2/3" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-5/6" />
            </div>
          </Card>

          {/* Heading + description */}
          <div className="text-center">
            <h3 className="text-lg font-medium mb-1 text-foreground ">
              Document not found
            </h3>
            <p className="text-sm">Create a new document?</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col -mt-4 gap-2 w-full max-w-md">
            <Button
              size="sm"
              variant="ghost"
              className="w-56 self-center bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:text-cyan-800 dark:hover:text-cyan-200 border border-cyan-200 dark:border-cyan-800 transition-colors duration-200"
              onClick={() =>
                handleCreateDocumentWithId(showCreateDocumentForId)
              }
              disabled={isCreatingDocument}
            >
              {isCreatingDocument ? (
                <Loader2 className="size-4 animate-spin mx-auto" />
              ) : (
                'Create'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-56 self-center bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
              size="sm"
              onClick={() => router.push('/documents')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      <div className="grid grid-cols-[auto_1fr_auto] items-center border-b px-3 h-[45px] gap-2">
        <SidebarTrigger />
        {isPending ? (
          <div className="h-4 w-32 bg-muted rounded-sm animate-pulse" />
        ) : (
          <div className="flex flex-col min-w-0 max-w-[calc(100vw-400px)]">
            <div className="h-6 flex items-center overflow-x-auto overflow-y-hidden document-title-scroll">
              <Input
                ref={titleInputRef}
                value={
                  editingTitle
                    ? newTitle
                    : (latestDocument?.title ?? artifact.title ?? 'Document')
                }
                onChange={(e) => setNewTitle(e.target.value)}
                className={`h-6 py-0 px-1 font-medium leading-6 bg-transparent border-none outline-none shadow-none ring-0 text-left min-w-0 flex-1 ${latestDocument ? 'cursor-pointer' : 'text-muted-foreground'} ${!editingTitle ? 'cursor-pointer' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEditTitle();
                }}
                onBlur={handleSaveTitle}
                onClick={
                  latestDocument && !editingTitle ? handleEditTitle : undefined
                }
                onDoubleClick={
                  latestDocument && !editingTitle ? handleEditTitle : undefined
                }
                disabled={isRenamingDocument || !latestDocument}
                aria-label="Edit document title"
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          {documents && documents.length > 0 && (
            <DocumentActions
              content={editorContent}
              saveStatus={saveStatus}
            />
          )}
          {latestDocument && (
            <PublishSettingsMenu
              document={latestDocument}
              user={user}
              onUpdate={handleDocumentUpdate}
            />
          )}
          {!user?.email?.includes('guest') && <AiSettingsMenu />}
          <SidebarTrigger side="right" />
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-background h-full overflow-y-auto overflow-x-hidden relative group">
        <VersionRail
          versions={versions}
          currentIndex={currentVersionIndex}
          onIndexChange={handleVersionChangeByIndex}
          baseDocumentId={editorDocumentId}
          isLoading={versionsLoading}
          refreshVersions={refreshVersions}
        />
        {!isCurrentVersion && versions && versions.length > 1 && (
          <VersionHeader
            key={`${currentDocument?.id}-${currentVersionIndex}`}
            currentVersionIndex={currentVersionIndex}
            versions={versions}
            handleVersionChange={handleVersionChange}
          />
        )}

        {/* Global preview confirmation overlay */}
        <div id="preview-confirmation-overlay" className="absolute inset-0 pointer-events-none z-50"></div>

        <div className="px-8 py-6 mx-auto max-w-full">
          {isPending ? (
            <EditorSkeleton />
          ) : (
            <Suspense fallback={<EditorSkeleton />}>
              <Editor
                key={editorDocumentId}
                content={editorContent}
                status={'idle'}
                isCurrentVersion={isCurrentVersion}
                currentVersionIndex={currentVersionIndex}
                documentId={editorDocumentId}
                initialLastSaved={
                  latestDocument ? new Date(latestDocument.updatedAt) : null
                }
                onStatusChange={handleStatusChange}
                onCreateDocumentRequest={handleCreateDocumentFromEditor}
                zoom={parseFloat(zoom)}
              />
            </Suspense>
          )}
        </div>
        <div className="fixed bottom-4 right-4 z-10">
          <Select onValueChange={handleZoomChange} value={zoom}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              {ZOOM_LEVELS.map((level) => (
                <SelectItem key={level.label} value={String(level.value)}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

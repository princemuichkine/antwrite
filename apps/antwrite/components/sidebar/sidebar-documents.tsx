'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/auth';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { cn, fetcher } from '@/lib/utils';
import { MoreHorizontalIcon } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Document } from '@antwrite/db';
import { useArtifact } from '@/hooks/use-artifact';
import type { ArtifactKind } from '@/components/artifact';
import { useDocumentUtils } from '@/hooks/use-document-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';
import useSWRInfinite from 'swr/infinite';

type GroupedDocuments = {
  favorites: Document[];
  today: Document[];
  yesterday: Document[];
  lastWeek: Document[];
  lastMonth: Document[];
  older: Document[];
};

const DOCUMENT_PAGE_SIZE = 25;

interface PaginatedDocuments {
  documents: Document[];
  hasMore: boolean;
}

const PureDocumentItem = ({
  document,
  isActive,
  onDelete,
  setOpenMobile,
  onSelect,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onStar,
  onClone,
}: {
  document: Document;
  isActive: boolean;
  onDelete: (documentId: string) => void;
  setOpenMobile: (open: boolean) => void;
  onSelect: (documentId: string) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (documentId: string, isSelected: boolean) => void;
  onStar: (documentId: string, isStarred: boolean) => void;
  onClone: (documentId: string, title: string) => void;
}) => {
  const handleDocumentClick = useCallback(
    (e: React.MouseEvent) => {
      if (isActive && !isSelectionMode) {
        e.preventDefault();
        return;
      }

      if (isSelectionMode) {
        onToggleSelect(document.id, !isSelected);
        return;
      }

      if (typeof window !== 'undefined') {
        (window as any).__LAST_SELECTED_DOCUMENT = document.id;
        if ((window as any).__DOCUMENT_CACHE) {
          (window as any).__DOCUMENT_CACHE.set(document.id, document);
        }
      }

      setOpenMobile(false);
      onSelect(document.id);
    },
    [
      document,
      isActive,
      isSelectionMode,
      isSelected,
      onToggleSelect,
      setOpenMobile,
      onSelect,
    ],
  );

  const router = useRouter();

  return (
    <SidebarMenuItem>
      <div className="flex items-center w-full">
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn('flex-1', isSelectionMode && 'pr-1')}
        >
          <Link
            href={isSelectionMode ? '#' : `/documents/${document.id}`}
            onClick={handleDocumentClick}
            className="flex items-center w-full"
          >
            {isSelectionMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onToggleSelect(document.id, !!checked)
                }
                aria-label={`Select ${document.title}`}
                className="mr-1 shrink-0"
              />
            )}
            <span className="truncate max-w-[calc(100%-1rem)] block">{document.title}</span>
          </Link>
        </SidebarMenuButton>
      </div>

      {!isSelectionMode && (
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            align="end"
            className="w-[--radix-popper-anchor-width] min-w-[114px]"
            sideOffset={8}
            alignOffset={-6}
          >
            <DropdownMenuItem
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors duration-200 mb-1"
              onSelect={() =>
                onStar(document.id, !(document as any).is_starred)
              }
            >
              <LottieIcon
                animationData={animations.star}
                size={16}
                loop={false}
                autoplay={false}
                initialFrame={0}
                className="mr-1"
              // customColor={[0.7059, 0.3255, 0.0353]} // amber-700 #b45309
              />
              <span>{(document as any).is_starred ? 'Unstar' : 'Star'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors duration-200 mb-1"
              onSelect={() => onClone(document.id, `${document.title}`)}
            >
              <LottieIcon
                animationData={animations.cube}
                size={16}
                loop={false}
                autoplay={false}
                initialFrame={0}
                className="mr-1"
              // customColor={[0.0549, 0.4549, 0.5647]} // cyan-700 #0e7490
              />
              <span>Clone</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 focus:bg-pink-100 dark:focus:bg-pink-900/40 focus:text-pink-800 dark:focus:text-pink-200 transition-colors duration-200"
              onSelect={() => onDelete(document.id)}
            >
              <LottieIcon
                animationData={animations.trash}
                size={16}
                loop={false}
                autoplay={false}
                initialFrame={0}
                className="mr-1"
              // customColor={[0.7451, 0.0941, 0.3647]} // pink-700 #be185d
              />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
};

export const DocumentItem = memo(PureDocumentItem, (prevProps, nextProps) => {
  if (prevProps.document.title !== nextProps.document.title) return false;
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.document.id !== nextProps.document.id) return false;
  if (
    (prevProps.document as any).is_starred !==
    (nextProps.document as any).is_starred
  )
    return false;
  return true;
});

export function SidebarDocuments({
  user,
  initialDocuments,
}: { user?: User; initialDocuments?: any[] }) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const { setArtifact } = useArtifact();
  const { createNewDocument, deleteDocument, isCreatingDocument } =
    useDocumentUtils();

  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    data: paginatedDocumentsData,
    isLoading,
    mutate,
  } = useSWRInfinite<PaginatedDocuments>(
    (pageIndex, previousPageData) => {
      if (!user) return null;
      if (previousPageData && !previousPageData.hasMore) return null;
      if (pageIndex === 0) return `/api/document?limit=${DOCUMENT_PAGE_SIZE}`;
      if (!previousPageData?.documents?.length) return null;
      const lastDoc = previousPageData.documents.at(-1);
      if (!lastDoc) return null;
      return `/api/document?limit=${DOCUMENT_PAGE_SIZE}&ending_before=${lastDoc.id}`;
    },
    fetcher,
    {
      fallbackData: initialDocuments
        ? [{ documents: initialDocuments, hasMore: false }]
        : [],
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const documents = useMemo(
    () =>
      paginatedDocumentsData
        ? paginatedDocumentsData.flatMap((page) => page.documents)
        : [],
    [paginatedDocumentsData],
  );
  const lastPage = paginatedDocumentsData?.[paginatedDocumentsData.length - 1];
  const hasReachedEnd = lastPage ? !lastPage.hasMore : false;
  const hasEmptyDocuments =
    paginatedDocumentsData?.every((page) => page.documents.length === 0) ??
    false;

  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/\/documents\/([^/?]+)/);
    const newActiveId = match ? match[1] : null;

    if (newActiveId !== activeDocumentId) {
      setActiveDocumentId(newActiveId);
    }

    const updateActiveDocument = () => {
      const newPathname = window.location.pathname;
      const newMatch = newPathname.match(/\/documents\/([^/?]+)/);
      const newId = newMatch ? newMatch[1] : null;

      setActiveDocumentId(newId);
    };

    window.addEventListener('popstate', updateActiveDocument);

    return () => {
      window.removeEventListener('popstate', updateActiveDocument);
    };
  }, [pathname, activeDocumentId]);

  useEffect(() => {
    const handleDocumentCreated = (event: CustomEvent) => {
      console.log(
        '[SidebarDocuments] Document created event received',
        event.detail,
      );

      if (event.detail?.document) {
        mutate();
      }
    };

    const handleDocumentRenamed = (event: CustomEvent) => {
      console.log(
        '[SidebarDocuments] Document renamed event received',
        event.detail,
      );

      if (event.detail?.documentId && event.detail?.newTitle) {
        mutate((pages) => {
          if (!pages) return pages;
          return pages.map((page) => ({
            ...page,
            documents: page.documents.map((doc) => {
              if (doc.id === event.detail.documentId) {
                return { ...doc, title: event.detail.newTitle };
              }
              return doc;
            }),
          }));
        }, false);
      }
    };

    window.addEventListener(
      'document-created',
      handleDocumentCreated as EventListener,
    );
    window.addEventListener(
      'document-renamed',
      handleDocumentRenamed as EventListener,
    );

    return () => {
      window.removeEventListener(
        'document-created',
        handleDocumentCreated as EventListener,
      );
      window.removeEventListener(
        'document-renamed',
        handleDocumentRenamed as EventListener,
      );
    };
  }, [mutate]);

  useEffect(() => {
    if (activeDocumentId) {
      console.log(
        '[SidebarDocuments] Active document changed, refreshing list',
      );
      mutate();
    }

    const handleDocumentUpdate = () => {
      console.log('[SidebarDocuments] Document updated, refreshing list');
      mutate();
    };

    window.addEventListener('document-updated', handleDocumentUpdate);
    return () => {
      window.removeEventListener('document-updated', handleDocumentUpdate);
    };
  }, [activeDocumentId, mutate]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [showMultiDeleteDialog, setShowMultiDeleteDialog] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedDocuments(new Set());
  };

  const handleToggleSelect = (documentId: string, isSelected: boolean) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (documents) {
      const filteredDocuments = filterDocuments(documents);
      if (selectedDocuments.size === filteredDocuments.length) {
        setSelectedDocuments(new Set());
      } else {
        setSelectedDocuments(new Set(filteredDocuments.map((doc) => doc.id)));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setShowDeleteDialog(false);

    const url = new URL(window.location.href);
    const documentFromUrl = url.searchParams.get('document');
    const isCurrentDocument = documentFromUrl === deleteId;

    const redirectUrl = isCurrentDocument ? `/documents/${deleteId}` : '';

    const success = await deleteDocument(deleteId, {
      redirectUrl: redirectUrl,
    });

    if (success) {
      mutate((pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          documents: page.documents.filter((d) => d.id !== deleteId),
        }));
      }, false);
    }
  };

  const handleDeleteMultiple = async () => {
    const selectedDocumentIds = Array.from(selectedDocuments);

    setShowMultiDeleteDialog(false);

    const url = new URL(window.location.href);
    const documentFromUrl = url.searchParams.get('document');
    const isCurrentDocumentSelected =
      documentFromUrl && selectedDocuments.has(documentFromUrl);

    try {
      mutate((pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          documents: page.documents.filter((d) => !selectedDocuments.has(d.id)),
        }));
      }, false);

      if (isCurrentDocumentSelected) {
        router.replace(`/documents/${documentFromUrl}`);
      }

      const deletePromises = selectedDocumentIds.map((documentId) =>
        deleteDocument(documentId, { redirectUrl: '' }),
      );

      await Promise.all(deletePromises);

      setSelectedDocuments(new Set());
      setIsSelectionMode(false);

      toast.success(`${selectedDocumentIds.length} documents deleted`);
    } catch (error) {
      console.error(
        '[SidebarDocuments] Error deleting multiple documents:',
        error,
      );
      toast.error('Failed to delete some documents');

      mutate();
    }
  };

  const handleStar = async (documentId: string, isStarred: boolean) => {
    if (isStarring) return;

    setIsStarring(true);
    try {
      const response = await fetch('/api/document/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          isStarred,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle star');
      }

      // Update the documents optimistically
      mutate((pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          documents: page.documents.map((doc) => {
            if (doc.id === documentId) {
              return { ...doc, is_starred: isStarred } as any;
            }
            return doc;
          }),
        }));
      }, false);

      toast.success(isStarred ? 'Document starred' : 'Document unstarred');
    } catch (error: any) {
      console.error('Error toggling star:', error);
      toast.error(error.message || 'Failed to toggle star');
    } finally {
      setIsStarring(false);
    }
  };

  const handleClone = async (documentId: string, originalTitle: string) => {
    if (isCloning) return;

    setIsCloning(true);
    try {
      // Generate a unique title for the clone
      const timestamp = new Date().toLocaleString();
      const newTitle = `${originalTitle} - Copy ${timestamp}`;

      const response = await fetch('/api/document/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          newTitle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clone document');
      }

      // Refresh the documents list to show the new clone
      mutate();

      toast.success('Document cloned successfully');

      // Navigate to the cloned document
      if (result.document?.id) {
        router.push(`/documents/${result.document.id}`);
      }
    } catch (error: any) {
      console.error('Error cloning document:', error);
      toast.error(error.message || 'Failed to clone document');
    } finally {
      setIsCloning(false);
    }
  };

  const handleDocumentSelect = useCallback(
    async (documentId: string) => {
      setActiveDocumentId(documentId);

      try {
        if (documentId === 'init' || !documentId) {
          console.error('[SidebarDocuments] Invalid document ID:', documentId);
          return;
        }

        const selectedDocData = documents?.find((doc) => doc.id === documentId);

        setArtifact((curr: any) => {
          const newTitle = selectedDocData?.title || 'Loading...';
          const newKind = (selectedDocData?.kind as ArtifactKind) || 'text';

          console.log(
            `[SidebarDocuments] Optimistically setting artifact: ID=${documentId}, Title=${newTitle}`,
          );
          return {
            ...curr,
            documentId: documentId,
            title: newTitle,
            content: '',
            kind: newKind,
            status: 'idle',
          };
        });

        console.log(
          '[SidebarDocuments] Navigating to:',
          `/documents/${documentId}`,
        );
        router.push(`/documents/${documentId}`);

        setOpenMobile(false);
      } catch (error) {
        console.error('[SidebarDocuments] Error selecting document:', error);
        toast.error('Failed to load document');
        setArtifact((curr: any) => ({ ...curr, status: 'idle' }));
      }
    },
    [documents, setArtifact, router, setOpenMobile],
  );

  const filterDocuments = (docs: Document[]) => {
    if (!searchTerm.trim()) return docs;

    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const groupDocumentsByDate = (docs: Document[]): GroupedDocuments => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    return docs.reduce(
      (groups, doc) => {
        const docDate = new Date(doc.createdAt);
        const isStarred = (doc as any).is_starred;

        if (isStarred) {
          groups.favorites.push(doc);
        } else if (isToday(docDate)) {
          groups.today.push(doc);
        } else if (isYesterday(docDate)) {
          groups.yesterday.push(doc);
        } else if (docDate > oneWeekAgo) {
          groups.lastWeek.push(doc);
        } else if (docDate > oneMonthAgo) {
          groups.lastMonth.push(doc);
        } else {
          groups.older.push(doc);
        }

        return groups;
      },
      {
        favorites: [],
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      } as GroupedDocuments,
    );
  };

  if (isLoading && documents.length === 0) {
    return (
      <SidebarGroup>
        <div className="px-0 py-1 text-xs text-sidebar-foreground/50">
          Loading...
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-sm h-8 flex gap-2 px-0 items-center"
              >
                <div
                  className="h-4 rounded-sm flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const filteredDocuments = documents ? filterDocuments(documents) : [];
  if (hasEmptyDocuments && !searchTerm) {
    return (
      <SidebarGroup>
        <div className="px-0 py-1 text-xs text-sidebar-foreground/50 flex items-center justify-between cursor-pointer hover:text-sidebar-foreground/70 transition-colors duration-200">
          <span>Documents</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 hover:bg-accent/50 transition-colors duration-200 text-sidebar-foreground rounded-sm flex items-center justify-center cursor-pointer"
            onClick={createNewDocument}
            disabled={isCreatingDocument}
          >
            {isCreatingDocument ? (
              <svg className="animate-spin size-3 text-sidebar-foreground/50" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <LottieIcon
                animationData={animations.fileplus}
                size={13}
                loop={false}
                autoplay={false}
                initialFrame={0}
                className="text-sidebar-foreground/50"
              />
            )}
          </Button>
        </div>
        <SidebarGroupContent>
          <div className="px-0 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 py-4">
            No documents yet
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <div
          role="button"
          tabIndex={0}
          className="px-0 py-1 text-xs text-sidebar-foreground/50 flex items-center justify-between cursor-pointer hover:text-sidebar-foreground/70 transition-colors duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <span className="font-medium">
            {documents && documents.length === 1 ? 'Document' : 'Documents'}{' '}
            {documents && documents.length > 1 && (
              <span className="text-sidebar-foreground/30">
                ({documents.length})
              </span>
            )}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-5 hover:bg-accent/50 transition-colors duration-200 text-sidebar-foreground rounded-sm flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                createNewDocument();
              }}
              disabled={isCreatingDocument}
            >
              {isCreatingDocument ? (
                <svg className="animate-spin size-3 text-sidebar-foreground/50" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <LottieIcon
                  animationData={animations.fileplus}
                  size={13}
                  loop={false}
                  autoplay={false}
                  initialFrame={0}
                  className="text-sidebar-foreground/50"
                />
              )}
            </Button>
            <div className="size-5 hover:bg-accent/50 transition-colors duration-200 text-sidebar-foreground rounded-sm flex items-center justify-center cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 text-sidebar-foreground/50 ${isExpanded ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <>
            <div className="px-0 mt-1 mb-2">
              <Input
                placeholder={documents && documents.length === 1 ? "Search" : "Search documents..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm border data-[state=open]:border-border text-accent-foreground bg-background hover:bg-accent/50 transition-colors duration-200"
              />
            </div>

            {filteredDocuments.length > 0 && (
              <div className="flex flex-wrap items-center justify-start px-0 py-1 mb-2 gap-2">
                {!isSelectionMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectionMode}
                    className="h-6 text-xs px-1.5 border text-sidebar-foreground/50 hover:bg-accent/50 transition-colors duration-200"
                  >
                    Select
                  </Button>
                )}
                {isSelectionMode && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectedDocuments.size === filteredDocuments.length ? handleToggleSelectionMode : handleSelectAll}
                      className="h-6 text-xs px-1.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:text-cyan-800 dark:hover:text-cyan-200 border border-cyan-200 dark:border-cyan-800 transition-colors duration-200"
                    >
                      {selectedDocuments.size === filteredDocuments.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        selectedDocuments.size > 0 &&
                        setShowMultiDeleteDialog(true)
                      }
                      disabled={selectedDocuments.size === 0}
                      className="h-6 text-xs px-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200 disabled:opacity-50"
                    >
                      Delete
                      {selectedDocuments.size > 1
                        ? ` (${selectedDocuments.size})`
                        : ''}
                    </Button>

                  </>
                )}
              </div>
            )}

            <SidebarGroupContent>
              <SidebarMenu>
                {searchTerm.trim() ? (
                  filteredDocuments.length === 0 ? (
                    <div className="px-0 text-zinc-500 text-sm text-center py-4">
                      No documents found matching &quot;{searchTerm}&quot;
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <DocumentItem
                        key={`${doc.id}-${doc.createdAt}`}
                        document={doc}
                        isActive={doc.id === activeDocumentId}
                        onDelete={(documentId) => {
                          setDeleteId(documentId);
                          setShowDeleteDialog(true);
                        }}
                        setOpenMobile={setOpenMobile}
                        onSelect={handleDocumentSelect}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedDocuments.has(doc.id)}
                        onToggleSelect={handleToggleSelect}
                        onStar={handleStar}
                        onClone={handleClone}
                      />
                    ))
                  )
                ) : (
                  (() => {
                    const groupedDocuments =
                      groupDocumentsByDate(filteredDocuments);
                    return (
                      <>
                        {groupedDocuments.favorites.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium flex items-center gap-1">
                              {/* <LottieIcon
                                animationData={animations.star}
                                size={12}
                                loop={false}
                                autoplay={false}
                                initialFrame={0}
                              /> */}
                              {groupedDocuments.favorites.length === 1 ? 'Favorite' : 'Favorites'}
                            </div>
                            {groupedDocuments.favorites.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}

                        {groupedDocuments.today.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium">
                              Today
                            </div>
                            {groupedDocuments.today.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}

                        {groupedDocuments.yesterday.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4">
                              Yesterday
                            </div>
                            {groupedDocuments.yesterday.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}

                        {groupedDocuments.lastWeek.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4">
                              Last 7 days
                            </div>
                            {groupedDocuments.lastWeek.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}

                        {groupedDocuments.lastMonth.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4">
                              Last 30 days
                            </div>
                            {groupedDocuments.lastMonth.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}

                        {groupedDocuments.older.length > 0 && (
                          <>
                            <div className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4">
                              Older
                            </div>
                            {groupedDocuments.older.map((doc) => (
                              <DocumentItem
                                key={`${doc.id}-${doc.createdAt}`}
                                document={doc}
                                isActive={doc.id === activeDocumentId}
                                onDelete={(documentId) => {
                                  setDeleteId(documentId);
                                  setShowDeleteDialog(true);
                                }}
                                setOpenMobile={setOpenMobile}
                                onSelect={handleDocumentSelect}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedDocuments.has(doc.id)}
                                onToggleSelect={handleToggleSelect}
                                onStar={handleStar}
                                onClone={handleClone}
                              />
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </>
        )}
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              document and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showMultiDeleteDialog}
        onOpenChange={setShowMultiDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDocuments.size === 1
                ? 'Delete this document?'
                : `Delete ${selectedDocuments.size} documents?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected {selectedDocuments.size === 1 ? 'document' : 'documents'}{' '}
              and remove {selectedDocuments.size === 1 ? 'it' : 'them'} from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMultiple}
              className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
            >
              {selectedDocuments.size === 1
                ? 'Delete'
                : `Delete ${selectedDocuments.size} documents`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

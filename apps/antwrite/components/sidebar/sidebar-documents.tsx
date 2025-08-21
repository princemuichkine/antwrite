'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/auth';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from '@/components/toast';
import { cn, fetcher } from '@/lib/utils';
import {
  MoreHorizontalIcon,
  FolderIcon,
  FolderPlusIcon,
  FolderOpenIcon,
  FilePlusIcon,
} from '@/components/icons';
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
import type { Document, Folder } from '@antwrite/db';
import { useArtifact } from '@/hooks/use-artifact';
import type { ArtifactKind } from '@/components/artifact';
import { useDocumentUtils } from '@/hooks/use-document-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { File, Star, Loader2 as Spinner } from 'lucide-react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

const DocumentDragPreview = ({
  document,
  count,
}: {
  document: Document;
  count: number;
}) => {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-sidebar p-2 text-sm text-sidebar-foreground shadow-lg">
      <File className="size-4 shrink-0" />
      <span className="truncate max-w-48">{document.title}</span>
      {count > 3 && (
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {count}
        </span>
      )}
    </div>
  );
};

const FolderItem = ({
  folder,
  children,
  isExpanded,
  onToggleExpand,
  onRename,
  onClone,
  onDelete,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: {
  folder: Folder;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRename: (folderId: string, currentName: string) => void;
  onClone: (folderId: string, folderName: string) => void;
  onDelete: (folderId: string) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (folderId: string, isSelected: boolean) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
    },
  });
  return (
    <SidebarMenuItem
      ref={setNodeRef}
      className="flex-col items-start"
      style={{
        backgroundColor: isOver ? 'rgba(0, 128, 128, 0.1)' : undefined,
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      <div className="flex items-center w-full group">
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(folder.id, !!checked)}
            aria-label={`Select ${folder.name}`}
            className="mr-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <SidebarMenuButton
          onClick={
            isSelectionMode
              ? () => onToggleSelect(folder.id, !isSelected)
              : onToggleExpand
          }
          className="flex-1 flex items-center gap-1.5"
        >
          {isExpanded ? (
            <FolderOpenIcon className="size-4" />
          ) : (
            <FolderIcon className="size-4" />
          )}
          <span className="truncate max-w-[calc(100%-3rem)] block">
            {folder.name}
          </span>
        </SidebarMenuButton>
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontalIcon />
              <span className="sr-only">More options for {folder.name}</span>
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
              onSelect={() => onRename(folder.id, folder.name)}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors duration-200 mb-1"
              onSelect={() => onClone(folder.id, folder.name)}
            >
              Clone
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 focus:bg-pink-100 dark:focus:bg-pink-900/40 focus:text-pink-800 dark:focus:text-pink-200 transition-colors duration-200"
              onSelect={() => onDelete(folder.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && (
        <SidebarGroupContent className="w-full pl-3 mt-1">
          <SidebarMenu>{children}</SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarMenuItem>
  );
};

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
  onMove,
  folders,
  isDragDisabled,
  showStar,
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
  onMove: (documentId: string, folderId: string | null) => void;
  folders: Folder[];
  isDragDisabled: boolean;
  showStar?: boolean;
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

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: document.id,
    data: {
      type: 'document',
      document: document,
    },
    disabled: isDragDisabled,
  });

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center w-full">
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) =>
              onToggleSelect(document.id, !!checked)
            }
            aria-label={`Select ${document.title}`}
            className="mr-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <SidebarMenuButton
          {...listeners}
          {...attributes}
          asChild
          isActive={isActive}
          className={cn('flex-1', isSelectionMode && 'pr-1')}
        >
          <Link
            href={isSelectionMode ? '#' : `/documents/${document.id}`}
            onClick={handleDocumentClick}
            className="flex items-center w-full"
          >
            {showStar && (
              <Star className="size-3.5 mr-1.5 text-yellow-400 fill-yellow-400 shrink-0" />
            )}
            <span className="truncate max-w-[calc(100%-2rem)] block">
              {document.title}
            </span>
          </Link>
        </SidebarMenuButton>
      </div>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            onPointerDown={(e) => e.stopPropagation()}
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
            onSelect={() => onStar(document.id, !(document as any).is_starred)}
          >
            <span>{(document as any).is_starred ? 'Unstar' : 'Star'}</span>
          </DropdownMenuItem>

          {document.folderId && (
            <DropdownMenuItem
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors duration-200 mb-1"
              onSelect={() => onMove(document.id, null)}
            >
              <span>Unfile</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors duration-200 mb-1"
            onSelect={() => onClone(document.id, `${document.title}`)}
          >
            <span>Clone</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 focus:bg-pink-100 dark:focus:bg-pink-900/40 focus:text-pink-800 dark:focus:text-pink-200 transition-colors duration-200"
            onSelect={() => onDelete(document.id)}
          >
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  if (prevProps.folders.length !== nextProps.folders.length) return false;
  if (prevProps.isDragDisabled !== nextProps.isDragDisabled) return false;
  if (prevProps.showStar !== nextProps.showStar) return false;
  return true;
});

export function SidebarDocuments({
  user,
  initialDocuments,
}: {
  user?: User;
  initialDocuments?: any[];
}) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const { setArtifact } = useArtifact();
  const { createNewDocument, deleteDocument, isCreatingDocument } =
    useDocumentUtils();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(true);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameDialogState, setRenameDialogState] = useState({
    isOpen: false,
    folderId: '',
    currentName: '',
    newName: '',
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [isFolderSelectionMode, setIsFolderSelectionMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [showMultiDeleteFolderDialog, setShowMultiDeleteFolderDialog] =
    useState(false);

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [activeDragItem, setActiveDragItem] = useState<Document | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    }),
  );

  const { data: folders, mutate: mutateFolders } = useSWR<Folder[]>(
    user ? '/api/folder' : null,
    fetcher,
  );

  const isDragDisabled = !folders || folders.length < 1;

  const {
    data: paginatedDocumentsData,
    isLoading,
    mutate,
    size,
    setSize,
  } = useSWRInfinite<PaginatedDocuments>(
    (pageIndex, previousPageData) => {
      if (!user) return null;
      if (previousPageData && !previousPageData.hasMore) return null;
      if (pageIndex === 0) return `/api/document?limit=${DOCUMENT_PAGE_SIZE}`;
      if (!previousPageData?.documents?.length) return null;
      const lastDoc =
        previousPageData.documents[previousPageData.documents.length - 1];
      if (!lastDoc) return null;
      return `/api/document?limit=${DOCUMENT_PAGE_SIZE}&cursor=${lastDoc.createdAt}`;
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

  const hasEmptyDocuments =
    paginatedDocumentsData?.every((page) => page.documents.length === 0) ??
    false;

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

    const isCurrentDocument = activeDocumentId === deleteId;

    const success = await deleteDocument(deleteId, {
      redirectUrl: '',
    });

    if (success) {
      if (isCurrentDocument) {
        router.push('/documents');
      }
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

    const isCurrentDocumentSelected =
      activeDocumentId && selectedDocuments.has(activeDocumentId);

    try {
      mutate((pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          documents: page.documents.filter((d) => !selectedDocuments.has(d.id)),
        }));
      }, false);

      if (isCurrentDocumentSelected) {
        router.replace(`/documents`);
      }

      const deletePromises = selectedDocumentIds.map((documentId) =>
        deleteDocument(documentId, { redirectUrl: '' }),
      );

      await Promise.all(deletePromises);

      setSelectedDocuments(new Set());
      setIsSelectionMode(false);

      toast({
        type: 'success',
        description: `${selectedDocumentIds.length} documents deleted`,
      });
    } catch (error) {
      console.error(
        '[SidebarDocuments] Error deleting multiple documents:',
        error,
      );
      toast({
        type: 'error',
        description: 'Failed to delete some documents',
      });

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

      toast({
        type: 'success',
        description: isStarred ? 'Document starred' : 'Document unstarred',
      });
    } catch (error: any) {
      console.error('Error toggling star:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to toggle star',
      });
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

      toast({
        type: 'success',
        description: 'Document cloned successfully',
      });

      // Navigate to the cloned document
      if (result.document?.id) {
        router.push(`/documents/${result.document.id}`);
      }
    } catch (error: any) {
      console.error('Error cloning document:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to clone document',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleMoveDocument = async (
    documentId: string,
    folderId: string | null,
  ) => {
    try {
      await fetch(`/api/document/${documentId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      mutate();
      toast({
        type: 'success',
        description: 'Document moved',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to move document',
      });
    }
  };

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    setIsCreatingFolder(true);
    try {
      const response = await fetch('/api/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      mutateFolders(); // Re-fetch folders
      toast({
        type: 'success',
        description: `Folder "${name}" created`,
      });
      setNewFolderName('');
      setIsCreateFolderOpen(false);
    } catch (error) {
      console.error('[SidebarDocuments] Error creating folder:', error);
      toast({
        type: 'error',
        description: 'Failed to create folder',
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    setRenameDialogState({
      isOpen: true,
      folderId,
      currentName,
      newName: currentName,
    });
  };

  const submitRenameFolder = async () => {
    const { folderId, newName, currentName } = renameDialogState;
    if (!newName || newName.trim().length === 0 || newName === currentName) {
      setRenameDialogState({
        isOpen: false,
        folderId: '',
        currentName: '',
        newName: '',
      });
      return;
    }

    try {
      await fetch(`/api/folder/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      mutateFolders();
      toast({
        type: 'success',
        description: `Folder renamed to "${newName}"`,
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to rename folder',
      });
    } finally {
      setRenameDialogState({
        isOpen: false,
        folderId: '',
        currentName: '',
        newName: '',
      });
    }
  };

  const handleCloneFolder = async (folderId: string, folderName: string) => {
    try {
      const timestamp = new Date().toLocaleString();
      const newFolderName = `${folderName} - Copy ${timestamp}`;
      await fetch(`/api/folder/${folderId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newFolderName }),
      });
      mutateFolders();
      mutate(); // Re-fetch documents as well
      toast({
        type: 'success',
        description: 'Folder cloned',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to clone folder',
      });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderId) return;

    try {
      await fetch(`/api/folder/${deleteFolderId}`, {
        method: 'DELETE',
      });
      mutateFolders();
      mutate(); // Re-fetch documents to update their folderId to null
      toast({
        type: 'success',
        description: 'Folder deleted',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to delete folder',
      });
    } finally {
      setShowDeleteFolderDialog(false);
      setDeleteFolderId(null);
    }
  };

  const handleDeleteMultipleFolders = async () => {
    const folderIds = Array.from(selectedFolders);
    setShowMultiDeleteFolderDialog(false);

    try {
      await Promise.all(
        folderIds.map((folderId) =>
          fetch(`/api/folder/${folderId}`, {
            method: 'DELETE',
          }),
        ),
      );

      mutateFolders();
      mutate();
      toast({
        type: 'success',
        description: `${folderIds.length} folders deleted`,
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to delete some folders',
      });
    } finally {
      setSelectedFolders(new Set());
      setIsFolderSelectionMode(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const doc = documents.find((d) => d.id === event.active.id);
    if (doc) {
      if (isSelectionMode && !selectedDocuments.has(doc.id)) {
        setSelectedDocuments(new Set());
        setIsSelectionMode(false);
      }
      setActiveDragItem(doc);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const documentId = active.id as string;
      const document = documents.find((doc) => doc.id === documentId);
      const targetData = over.data.current as { type?: string };

      if (targetData?.type === 'folder') {
        const folderId = over.id as string;
        handleMoveDocument(documentId, folderId);
      }
    }

    setActiveDragItem(null);
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
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
        toast({
          type: 'error',
          description: 'Failed to load document',
        });
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

  const filterFolders = (foldersToFilter: Folder[]) => {
    if (!folderSearchTerm.trim()) return foldersToFilter;
    return foldersToFilter.filter((folder) =>
      folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase()),
    );
  };
  const filteredFolders = folders ? filterFolders(folders) : [];

  const filteredDocuments = documents ? filterDocuments(documents) : [];
  const documentsInFolders = filteredDocuments.filter((d) => d.folderId);
  const documentsWithoutFolders = filteredDocuments.filter((d) => !d.folderId);

  // Get all favorites from the complete list of documents
  const allFavorites = filteredDocuments.filter(
    (doc) => (doc as any).is_starred,
  );

  // Group documents that are not in folders
  const groupedFromRoot = groupDocumentsByDate(documentsWithoutFolders);

  // Create the final grouped object for rendering
  const groupedDocuments = {
    favorites: allFavorites,
    today: groupedFromRoot.today,
    yesterday: groupedFromRoot.yesterday,
    lastWeek: groupedFromRoot.lastWeek,
    lastMonth: groupedFromRoot.lastMonth,
    older: groupedFromRoot.older,
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

  /* if (hasEmptyDocuments && !searchTerm) {
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
              <svg
                className="animate-spin size-3 text-sidebar-foreground/50"
                viewBox="0 0 24 24"
              >
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
  } */

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {((folders && folders.length > 0) ||
        (documents && documents.length >= 2)) && (
        <SidebarGroup>
          <div
            role="button"
            tabIndex={0}
            className="px-0 py-1 text-xs text-sidebar-foreground dark:text-sidebar-foreground/70 flex items-center justify-between cursor-pointer hover:text-sidebar-foreground/80 dark:hover:text-sidebar-foreground/60 transition-colors duration-200"
            onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsFoldersExpanded(!isFoldersExpanded);
              }
            }}
          >
            <span className="font-medium">
              {folders && folders.length === 1 ? 'Folder' : 'Folders'}{' '}
              {folders && folders.length > 1 && (
                <span className="text-sidebar-foreground/30">
                  ({folders.length})
                </span>
              )}
            </span>
            <div className="flex items-center gap-0.5">
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
                  className={`transition-transform duration-200 text-sidebar-foreground/50 ${
                    isFoldersExpanded ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
          {isFoldersExpanded && (
            <>
              {folders && folders.length >= 2 && (
                <div className="px-0 mt-1 mb-2">
                  <Input
                    placeholder={
                      folders && folders.length === 1
                        ? 'Search'
                        : 'Search folders...'
                    }
                    value={folderSearchTerm}
                    onChange={(e) => setFolderSearchTerm(e.target.value)}
                    className="h-8 text-sm border data-[state=open]:border-border text-accent-foreground bg-background hover:bg-accent/50 transition-colors duration-200"
                  />
                </div>
              )}
              {folders && folders.length === 0 && (
                <div className="flex items-center justify-end px-0 py-1 mb-2">
                  <DropdownMenu
                    open={isCreateFolderOpen}
                    onOpenChange={setIsCreateFolderOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 transition-colors duration-200"
                      >
                        <FolderPlusIcon className="size-3.5 text-blue-700 dark:text-blue-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="w-56"
                      sideOffset={5}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <form
                        onSubmit={handleCreateFolder}
                        className="p-2 space-y-2"
                      >
                        <Input
                          placeholder="Folder name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 transition-colors duration-200"
                          disabled={isCreatingFolder || !newFolderName.trim()}
                        >
                          {isCreatingFolder ? (
                            <Spinner className="size-3 animate-spin" />
                          ) : (
                            'Create'
                          )}
                        </Button>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {filteredFolders.length > 0 && (
                <div className="flex flex-wrap items-center justify-start px-0 py-1 mb-2 gap-2">
                  {!isFolderSelectionMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsFolderSelectionMode(true);
                          setSelectedFolders(new Set());
                        }}
                        className="h-6 text-xs px-1.5 border text-sidebar-foreground/50 hover:bg-accent/50 transition-colors duration-200"
                      >
                        Select
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedFolders.size === filteredFolders.length) {
                            setIsFolderSelectionMode(false);
                            setSelectedFolders(new Set());
                          } else {
                            setSelectedFolders(
                              new Set(filteredFolders.map((f) => f.id)),
                            );
                          }
                        }}
                        className="h-6 text-xs px-1.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:text-cyan-800 dark:hover:text-cyan-200 border border-cyan-200 dark:border-cyan-800 transition-colors duration-200"
                      >
                        {selectedFolders.size === filteredFolders.length
                          ? 'Deselect'
                          : 'Select All'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedFolders.size > 0) {
                            setShowMultiDeleteFolderDialog(true);
                          }
                        }}
                        disabled={selectedFolders.size === 0}
                        className="h-6 text-xs px-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200 disabled:opacity-50"
                      >
                        Delete
                        {selectedFolders.size > 1
                          ? ` (${selectedFolders.size})`
                          : ''}
                      </Button>
                    </>
                  )}
                  <DropdownMenu
                    open={isCreateFolderOpen}
                    onOpenChange={setIsCreateFolderOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 transition-colors duration-200 ml-auto"
                      >
                        <FolderPlusIcon className="size-3.5 text-blue-700 dark:text-blue-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      className="w-56"
                      sideOffset={5}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <form
                        onSubmit={handleCreateFolder}
                        className="p-2 space-y-2"
                      >
                        <Input
                          placeholder="Folder name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 transition-colors duration-200"
                          disabled={isCreatingFolder || !newFolderName.trim()}
                        >
                          {isCreatingFolder ? (
                            <Spinner className="size-3 animate-spin" />
                          ) : (
                            'Create'
                          )}
                        </Button>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredFolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      isExpanded={expandedFolders.has(folder.id)}
                      onToggleExpand={() => {
                        setExpandedFolders((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(folder.id)) {
                            newSet.delete(folder.id);
                          } else {
                            newSet.add(folder.id);
                          }
                          return newSet;
                        });
                      }}
                      onRename={handleRenameFolder}
                      onClone={handleCloneFolder}
                      onDelete={(folderId) => {
                        setDeleteFolderId(folderId);
                        setShowDeleteFolderDialog(true);
                      }}
                      isSelectionMode={isFolderSelectionMode}
                      isSelected={selectedFolders.has(folder.id)}
                      onToggleSelect={(folderId, isSelected) => {
                        setSelectedFolders((prev) => {
                          const newSet = new Set(prev);
                          if (isSelected) {
                            newSet.add(folderId);
                          } else {
                            newSet.delete(folderId);
                          }
                          return newSet;
                        });
                      }}
                    >
                      {documentsInFolders
                        .filter((doc) => doc.folderId === folder.id)
                        .map((doc) => (
                          <DocumentItem
                            key={doc.id}
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
                            onMove={handleMoveDocument}
                            folders={folders ?? []}
                            isDragDisabled={isDragDisabled}
                          />
                        ))}
                    </FolderItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </>
          )}
        </SidebarGroup>
      )}

      <SidebarGroup>
        <div
          role="button"
          tabIndex={0}
          className="px-0 py-1 text-xs text-sidebar-foreground dark:text-sidebar-foreground/70 flex items-center justify-between cursor-pointer hover:text-sidebar-foreground/80 dark:hover:text-sidebar-foreground/60 transition-colors duration-200"
          onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDocumentsExpanded(!isDocumentsExpanded);
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
                className={`transition-transform duration-200 text-sidebar-foreground/50 ${
                  isDocumentsExpanded ? 'rotate-180' : ''
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {isDocumentsExpanded && (
          <>
            {documents && documents.length >= 2 && (
              <div className="px-0 mt-1 mb-2">
                <Input
                  placeholder={
                    documents && documents.length === 1
                      ? 'Search'
                      : 'Search documents...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-sm border data-[state=open]:border-border text-accent-foreground bg-background hover:bg-accent/50 transition-colors duration-200"
                />
              </div>
            )}

            {documents &&
              documents.length === 0 &&
              !isLoading &&
              !searchTerm.trim() && (
                <div className="flex items-center justify-end px-0 py-1 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewDocument();
                    }}
                    disabled={isCreatingDocument}
                  >
                    {isCreatingDocument ? (
                      <svg
                        className="animate-spin size-3 text-green-700 dark:text-green-300"
                        viewBox="0 0 24 24"
                      >
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
                      <FilePlusIcon className="size-3.5 text-green-700 dark:text-green-300" />
                    )}
                  </Button>
                </div>
              )}

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
                      onClick={
                        selectedDocuments.size === filteredDocuments.length
                          ? handleToggleSelectionMode
                          : handleSelectAll
                      }
                      className="h-6 text-xs px-1.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:text-cyan-800 dark:hover:text-cyan-200 border border-cyan-200 dark:border-cyan-800 transition-colors duration-200"
                    >
                      {selectedDocuments.size === filteredDocuments.length
                        ? 'Deselect'
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800 transition-colors duration-200 ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    createNewDocument();
                  }}
                  disabled={isCreatingDocument}
                >
                  {isCreatingDocument ? (
                    <svg
                      className="animate-spin size-3 text-green-700 dark:text-green-300"
                      viewBox="0 0 24 24"
                    >
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
                    <FilePlusIcon className="size-3.5 text-green-700 dark:text-green-300" />
                  )}
                </Button>
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
                        onMove={handleMoveDocument}
                        folders={folders ?? []}
                        isDragDisabled={isDragDisabled}
                      />
                    ))
                  )
                ) : (
                  (() => {
                    return (
                      <>
                        {groupedDocuments.favorites.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium flex items-center gap-1 cursor-pointer"
                              onClick={() => toggleSection('favorites')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('favorites');
                                }
                              }}
                            >
                              {groupedDocuments.favorites.length === 1
                                ? 'Favorite'
                                : 'Favorites'}
                            </div>
                            {!collapsedSections.favorites &&
                              groupedDocuments.favorites.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
                                  showStar
                                />
                              ))}
                          </>
                        )}

                        {groupedDocuments.today.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium cursor-pointer"
                              onClick={() => toggleSection('today')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('today');
                                }
                              }}
                            >
                              Today
                            </div>
                            {!collapsedSections.today &&
                              groupedDocuments.today.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
                                />
                              ))}
                          </>
                        )}

                        {groupedDocuments.yesterday.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4 cursor-pointer"
                              onClick={() => toggleSection('yesterday')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('yesterday');
                                }
                              }}
                            >
                              Yesterday
                            </div>
                            {!collapsedSections.yesterday &&
                              groupedDocuments.yesterday.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
                                />
                              ))}
                          </>
                        )}

                        {groupedDocuments.lastWeek.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4 cursor-pointer"
                              onClick={() => toggleSection('lastWeek')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('lastWeek');
                                }
                              }}
                            >
                              Last 7 days
                            </div>
                            {!collapsedSections.lastWeek &&
                              groupedDocuments.lastWeek.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
                                />
                              ))}
                          </>
                        )}

                        {groupedDocuments.lastMonth.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4 cursor-pointer"
                              onClick={() => toggleSection('lastMonth')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('lastMonth');
                                }
                              }}
                            >
                              Last 30 days
                            </div>
                            {!collapsedSections.lastMonth &&
                              groupedDocuments.lastMonth.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
                                />
                              ))}
                          </>
                        )}

                        {groupedDocuments.older.length > 0 && (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              className="px-0 py-1 text-xs text-sidebar-foreground/50 font-medium mt-4 cursor-pointer"
                              onClick={() => toggleSection('older')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleSection('older');
                                }
                              }}
                            >
                              Older
                            </div>
                            {!collapsedSections.older &&
                              groupedDocuments.older.map((doc) => (
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
                                  onMove={handleMoveDocument}
                                  folders={folders ?? []}
                                  isDragDisabled={isDragDisabled}
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
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
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

      <AlertDialog
        open={showMultiDeleteFolderDialog}
        onOpenChange={setShowMultiDeleteFolderDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedFolders.size === 1
                ? 'Delete this folder?'
                : `Delete ${selectedFolders.size} folders?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Documents in these folders will not
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMultipleFolders}
              className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
            >
              {selectedFolders.size === 1
                ? 'Delete'
                : `Delete ${selectedFolders.size} folders`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={renameDialogState.isOpen}
        onOpenChange={(isOpen) =>
          setRenameDialogState((s) => ({ ...s, isOpen }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for the folder &quot;
              {renameDialogState.currentName}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameDialogState.newName}
            onChange={(e) =>
              setRenameDialogState((s) => ({ ...s, newName: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitRenameFolder();
              }
            }}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setRenameDialogState({
                  isOpen: false,
                  folderId: '',
                  currentName: '',
                  newName: '',
                })
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={submitRenameFolder}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteFolderDialog}
        onOpenChange={setShowDeleteFolderDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Documents in this folder will not be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DragOverlay>
        {activeDragItem ? (
          <DocumentDragPreview
            document={activeDragItem}
            count={
              isSelectionMode && selectedDocuments.has(activeDragItem.id)
                ? selectedDocuments.size
                : 1
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

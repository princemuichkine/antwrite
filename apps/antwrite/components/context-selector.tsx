'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
    Search,
    FileText,
    Folder,
    MessageSquare,
    NotebookTabs,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContextItem = {
    id: string;
    title: string;
    type: 'document' | 'folder' | 'chat' | 'tab';
    subtitle?: string;
    icon?: ReactNode;
    items?: ContextItem[]; // For nested items like documents in a folder
};

type ContextSelectorProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: ContextItem) => void;
    position?: { x: number; y: number };
    className?: string;
    placeholder?: string;
    showSearchBar?: boolean;
    shouldFocusSearchInput?: boolean;
    searchQueryValue?: string;
    searchTypeFilter?: 'document' | 'folder' | 'chat' | 'tab' | null;
};

const CONTEXT_TYPES = [
    { id: 'document', label: 'Documents', icon: FileText },
    { id: 'folder', label: 'Folders', icon: Folder },
    { id: 'chat', label: 'Past Chats', icon: MessageSquare },
    { id: 'tab', label: 'Active Tabs', icon: NotebookTabs },
] as const;

export function ContextSelector({
    isOpen,
    onClose,
    onSelect,
    position,
    className,
    placeholder = "Add documents, folders, chats, or tabs...",
    showSearchBar = true,
    shouldFocusSearchInput = true,
    searchQueryValue,
    searchTypeFilter = null,
}: ContextSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [items, setItems] = useState<ContextItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && shouldFocusSearchInput && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, shouldFocusSearchInput]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (searchQueryValue !== undefined) {
            setSearchQuery(searchQueryValue);
        }
    }, [searchQueryValue]);

    // Fetch items based on search query and selected type
    useEffect(() => {
        if (!isOpen) return;

        const fetchItems = async () => {
            setIsLoading(true);
            try {
                const documentsPromise =
                    !searchTypeFilter || searchTypeFilter === 'document'
                        ? fetch(
                            `/api/search?query=${encodeURIComponent(
                                searchQuery,
                            )}&type=document&limit=10`,
                        )
                            .then((res) => (res.ok ? res.json() : { results: [] }))
                            .then((data) =>
                                (data.results || [])
                                    .filter((doc: any) => doc.title && doc.title !== 'Untitled')
                                    .map((doc: any) => ({
                                        id: doc.id,
                                        title: doc.title,
                                        type: 'document' as const,
                                        icon: <FileText className="size-2.5" />,
                                    })),
                            )
                        : Promise.resolve([]);

                const foldersPromise =
                    !searchTypeFilter || searchTypeFilter === 'folder'
                        ? fetch(
                            `/api/search?query=${encodeURIComponent(
                                searchQuery,
                            )}&type=folder&limit=10`,
                        )
                            .then((res) => (res.ok ? res.json() : { results: [] }))
                            .then((data) =>
                                (data.results || []).map((folder: any) => ({
                                    id: folder.id,
                                    title: folder.name,
                                    type: 'folder' as const,
                                    icon: <Folder className="size-2.5" />,
                                    items: (folder.documents || []).map((doc: any) => ({
                                        id: doc.id,
                                        title: doc.title,
                                        type: 'document' as const,
                                        icon: <FileText className="size-2.5" />,
                                    })),
                                })),
                            )
                        : Promise.resolve([]);

                const chatsPromise =
                    !searchTypeFilter || searchTypeFilter === 'chat'
                        ? fetch(
                            `/api/search?query=${encodeURIComponent(
                                searchQuery,
                            )}&type=chat&limit=10`,
                        )
                            .then((res) => (res.ok ? res.json() : { results: [] }))
                            .then((data) =>
                                (data.results || []).map((chat: any) => ({
                                    id: chat.id,
                                    title: chat.title,
                                    type: 'chat' as const,
                                    icon: <MessageSquare className="size-2.5" />,
                                })),
                            )
                        : Promise.resolve([]);
                const tabsPromise = Promise.resolve([]); // Placeholder for active tabs

                const [documents, folders, chats, tabs] = await Promise.all([
                    documentsPromise,
                    foldersPromise,
                    chatsPromise,
                    tabsPromise,
                ]);

                let allItems: ContextItem[] = [];
                if (searchQuery.trim() !== '') {
                    // When searching, show a flat list of all item types
                    allItems = [...documents, ...folders, ...chats, ...tabs];
                } else {
                    // When browsing, filter by the selected type
                    switch (selectedType) {
                        case 'document':
                            allItems = documents;
                            break;
                        case 'folder':
                            allItems = folders;
                            break;
                        case 'chat':
                            allItems = chats;
                            break;
                        case 'tab':
                            allItems = tabs;
                            break;
                        default:
                            allItems = [];
                    }
                }

                setItems(allItems);
            } catch (error) {
                console.error('Error fetching context items:', error);
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchItems();
    }, [searchQuery, selectedType, isOpen, searchTypeFilter]);

    const handleToggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    if (!isOpen) return null;

    const style = position ? {
        position: 'fixed' as const,
        top: position.y,
        left: position.x,
        transform: 'translateY(-100%)',
        zIndex: 50
    } : {};

    const renderItem = (item: ContextItem, isSubItem = false) => {
        const isFolder = item.type === 'folder' && item.items && item.items.length > 0;
        const isExpanded = isFolder && expandedFolders.has(item.id);

        return (
            <div key={`${item.type}-${item.id}`}>
                <button
                    type="button"
                    onClick={() => (isFolder ? handleToggleFolder(item.id) : onSelect(item))}
                    className={cn(
                        'w-full text-left px-1.5 py-1 rounded-sm hover:bg-accent/30 transition-colors duration-200 group h-6 flex items-center',
                        isSubItem && 'pl-4',
                    )}
                >
                    <div className="shrink-0 flex items-center gap-1.5">
                        {isFolder ? (
                            isExpanded ? (
                                <ChevronDown className="size-2.5" />
                            ) : (
                                <ChevronRight className="size-2.5" />
                            )
                        ) : null}
                        {item.icon}
                    </div>
                    <div className="flex-1 min-w-0 ml-1.5">
                        <div className="font-medium text-[6px] truncate">{item.title}</div>
                    </div>
                </button>
                {isExpanded && (
                    <div className="flex flex-col gap-1 mt-1">
                        {item.items?.map((subItem) => renderItem(subItem, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "bg-background border border-border rounded-sm shadow-lg w-40 max-h-48 flex flex-col opacity-90",
                position ? "fixed" : "absolute bottom-full left-0 mb-1",
                className
            )}
            style={style}
            onKeyDown={handleKeyDown}
        >
            {/* Search Header */}
            {showSearchBar && (
                <div className="p-1.5 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-1.5 top-1/2 translate-y-[calc(-50%+1px)] size-2.5 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSelectedType(null); // Reset type filter when searching
                            }}
                            placeholder={placeholder}
                            className="w-full pl-[21px] pr-4 py-1 text-[6px] bg-background border border-border rounded-sm focus:outline-none h-6"
                        />
                    </div>
                </div>
            )}
            <div className="overflow-y-auto flex-1 p-1.5">
                {/* Show type filters only when no type is selected and no search query exists */}
                {!selectedType && searchQuery.trim() === '' && !searchTypeFilter && (
                    <div className="flex flex-col gap-1">
                        {CONTEXT_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-1.5 py-1 text-[6px] rounded-sm transition-colors h-6 text-foreground bg-background/30 hover:bg-accent/30 border border-border/30 opacity-60 hover:opacity-100',
                                    )}
                                >
                                    <Icon className="size-2.5" />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Show items if a type is selected or there's a search query */}
                {(selectedType || searchQuery.trim() !== '' || searchTypeFilter) && (
                    <div className="flex flex-col gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {isLoading && (
                            <div className="text-muted-foreground text-[6px] p-1.5">Loading...</div>
                        )}
                        {!isLoading && items.length === 0 && (
                            <div className="text-muted-foreground text-[6px] p-1.5">No results found.</div>
                        )}
                        {!isLoading && items.map((item) => renderItem(item))}
                    </div>
                )}
            </div>
        </div>
    );
}

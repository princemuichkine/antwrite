'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Search, FileText, Folder, MessageSquare, NotebookTabs } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContextItem = {
    id: string;
    title: string;
    type: 'document' | 'folder' | 'chat' | 'tab';
    subtitle?: string;
    icon?: ReactNode;
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
}: ContextSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [items, setItems] = useState<ContextItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
                // Fetch documents
                const documentsPromise = fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=10`)
                    .then(res => res.ok ? res.json() : { results: [] })
                    .then(data => (data.results || [])
                        .filter((doc: any) => doc.title && doc.title !== 'Untitled')
                        .map((doc: any) => ({
                            id: doc.id,
                            title: doc.title,
                            type: 'document' as const,
                            icon: <FileText className="size-2.5" />,
                        })));

                // TODO: Add other sources
                const foldersPromise = Promise.resolve([]); // Placeholder for folders
                const chatsPromise = Promise.resolve([]); // Placeholder for past chats
                const tabsPromise = Promise.resolve([]); // Placeholder for active tabs

                const [documents, folders, chats, tabs] = await Promise.all([
                    documentsPromise,
                    foldersPromise,
                    chatsPromise,
                    tabsPromise,
                ]);

                let allItems: ContextItem[] = [...documents, ...folders, ...chats, ...tabs];

                // The server already performs a search, so this client-side filtering is redundant and can cause inconsistencies.
                // if (searchQuery.trim() !== '') {
                //     allItems = allItems.filter(item =>
                //         item.title.toLowerCase().startsWith(searchQuery.toLowerCase())
                //     );
                // }

                // Filter by selected type (only if a type is selected)
                if (selectedType) {
                    allItems = allItems.filter(item => item.type === selectedType);
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
    }, [searchQuery, selectedType, isOpen]);

    // useEffect(() => {
    //     // If the selector is open, there's a search query, but there are no items to show,
    //     // and we are not in a loading state, then close the selector.
    //     if (isOpen && !isLoading && items.length === 0 && searchQuery.trim() !== '') {
    //         onClose();
    //     }
    // }, [items, isOpen, isLoading, searchQuery, onClose]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    const style = position ? {
        position: 'fixed' as const,
        top: position.y,
        left: position.x,
        transform: 'translateY(-100%)',
        zIndex: 50
    } : {};

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
            <div className="p-1.5 border-b border-border">
                {showSearchBar && (
                    <div className="relative">
                        <Search className="absolute left-1.5 top-1/2 translate-y-[calc(-50%+1px)] size-2.5 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={placeholder}
                            className="w-full pl-[21px] pr-4 py-1 text-[6px] bg-background border border-border rounded-sm focus:outline-none h-6"
                        />
                    </div>
                )}

                {/* Type Filters - Vertical Layout - Hide when there are search results */}
                {items.length === 0 && (
                    <div className="flex flex-col gap-1 mt-1.5">
                        {CONTEXT_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-1.5 py-1 text-[6px] rounded-sm transition-colors h-6",
                                        selectedType === type.id
                                            ? "bg-accent/30 text-foreground"
                                            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                                    )}
                                >
                                    <Icon className="size-2.5" />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Results - Show right below search bar where filters were */}
                {items.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {items.map((item) => (
                            <button
                                type="button"
                                key={`${item.type}-${item.id}`}
                                onClick={() => onSelect(item)}
                                className="w-full text-left px-1.5 py-1 rounded-sm hover:bg-accent/30 transition-colors duration-200 group h-6 flex items-center"
                            >
                                <div className="shrink-0">
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0 ml-1.5">
                                    <div className="font-medium text-[6px] truncate">{item.title}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

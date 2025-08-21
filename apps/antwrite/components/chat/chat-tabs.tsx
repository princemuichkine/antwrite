'use client';

import { useEffect } from 'react';
import type { Chat } from '@antwrite/db';
import { fetcher, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusIcon, CrossIcon } from '../icons';
import { useDocumentUtils } from '@/hooks/use-document-utils';
import { useLocalStorage } from 'usehooks-ts';
import useSWR from 'swr';

type ChatTab = {
    id: string;
    title: string;
};

export const ChatTabs = ({
    activeChatId,
    className,
}: {
    activeChatId: string;
    className?: string;
}) => {
    const [openTabs, setOpenTabs] = useLocalStorage<ChatTab[]>('chat-tabs', []);
    const { handleResetChat, isCreatingChat } = useDocumentUtils();
    const { data: chatHistory } = useSWR<Array<Chat>>('/api/history', fetcher);

    useEffect(() => {
        if (activeChatId && chatHistory) {
            const activeChat = chatHistory.find((c) => c.id === activeChatId);
            if (activeChat && !openTabs.some((t) => t.id === activeChatId)) {
                const newTab = { id: activeChat.id, title: activeChat.title };
                if (openTabs.length >= 3) {
                    setOpenTabs((tabs) => [...tabs.slice(1), newTab]);
                } else {
                    setOpenTabs((tabs) => [...tabs, newTab]);
                }
            }
        }
    }, [activeChatId, chatHistory, openTabs, setOpenTabs]);

    const handleTabClick = (chatId: string) => {
        window.dispatchEvent(
            new CustomEvent('load-chat', {
                detail: { chatId },
            }),
        );
    };

    const handleCloseTab = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        setOpenTabs((tabs) => tabs.filter((t) => t.id !== chatId));
    };

    if (openTabs.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-1 h-full', className)}>
            {openTabs.map((tab) => (
                <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={cn(
                        'flex items-center h-full text-xs px-3 border-b-2 cursor-pointer',
                        tab.id === activeChatId
                            ? 'bg-background border-primary text-primary font-medium'
                            : 'border-transparent text-muted-foreground hover:bg-muted',
                    )}
                >
                    <span className="truncate max-w-[120px]">{tab.title}</span>
                    <button
                        onClick={(e) => handleCloseTab(e, tab.id)}
                        className="ml-2 p-0.5 rounded-full hover:bg-muted-foreground/20"
                    >
                        <CrossIcon size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
};

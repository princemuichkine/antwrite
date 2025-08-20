'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { cn, fetcher } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';

import { ChevronDownIcon } from '../icons';
import { Paywall } from '@/components/paywall';

export function ModelSelector({
  selectedModelId,
  className,
  minimal = false,
  onModelChange,
}: {
  selectedModelId: string;
  className?: string;
  minimal?: boolean;
  onModelChange: (newModelId: string) => void;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [isPaywallOpen, setPaywallOpen] = useState(false);

  const { data: subscriptionData, isLoading: isSubscriptionLoading } = useSWR<{
    hasActiveSubscription: boolean;
  }>('/api/user/subscription-status', fetcher, { revalidateOnFocus: false });
  const hasActiveSubscription =
    subscriptionData?.hasActiveSubscription ?? false;

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === selectedModelId),
    [selectedModelId],
  );

  if (isSubscriptionLoading) {
    return (
      <Button
        data-testid="model-selector"
        variant="outline"
        className={cn('px-2 h-8 rounded-sm border border-border', className)}
        disabled
      >
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:border-border data-[state=open]:text-sidebar-accent-foreground group',
            className,
          )}
        >
          <Button
            data-testid="model-selector"
            variant="outline"
            className="flex items-center gap-1.5 px-2 h-8 rounded-sm hover:bg-accent/50 transition-colors duration-200 border border-border"
          >
            <span className="truncate">
              {minimal ? selectedModelId.split('-')[0] : selectedChatModel?.name}
            </span>
            <ChevronDownIcon size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-sm border-border shadow-lg bg-background"
          sideOffset={4}
        >
          {chatModels.map((chatModel) => {
            const { id, proOnly } = chatModel;
            const isLocked = proOnly === true && !hasActiveSubscription;

            return (
              <DropdownMenuItem
                data-testid={`model-selector-item-${id}`}
                key={id}
                onSelect={() => {
                  if (isLocked) {
                    setPaywallOpen(true);
                    return;
                  }
                  setOpen(false);
                  onModelChange(id);
                }}
                data-active={id === selectedModelId}
                className={cn(
                  "group relative flex w-full items-center gap-3 px-4 py-2.5 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors duration-200",
                  id === selectedModelId && !isLocked && "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                )}
              >
                <div className="flex flex-col gap-1 items-start flex-1">
                  <div>{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
                  </div>
                </div>
                {isLocked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaywallOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800"
                  >
                    Upgrade
                  </Button>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Paywall
        isOpen={isPaywallOpen}
        onOpenChange={setPaywallOpen}
        required={false}
      />
    </>
  );
}

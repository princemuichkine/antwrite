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
import { Loader2 } from 'lucide-react';
import { ChevronDownIcon } from '../icons';
import { Paywall } from '@/components/paywall';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ModelSelector({
  selectedModelId,
  className,
  minimal = false,
  onModelChange,
  open: controlledOpen,
  onOpenChange,
}: {
  selectedModelId: string;
  className?: string;
  minimal?: boolean;
  onModelChange: (newModelId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & React.ComponentProps<typeof Button>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isPaywallOpen, setPaywallOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && onOpenChange;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;

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
        className={cn('h-6 rounded-sm border border-border px-2', className)}
        disabled
      >
        <Loader2 className="animate-spin" size={6} />
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
            className="flex items-center gap-1.5 px-1.5 h-6 rounded-sm text-xs text-accent-foreground bg-background/30 hover:bg-accent/30 transition-colors duration-200 border border-border/30 opacity-60 hover:opacity-100"
          >
            <span className="truncate">{selectedChatModel?.name}</span>
            <ChevronDownIcon size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-sm border border-border shadow-lg bg-background opacity-90 space-y-1"
          sideOffset={4}
        >
          <TooltipProvider>
            {chatModels.map((chatModel) => {
              const { id, proOnly } = chatModel;
              const isLocked = proOnly === true && !hasActiveSubscription;

              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      data-testid={`model-selector-item-${id}`}
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
                        'group relative flex w-full items-center gap-1.5 px-1.5 py-1 cursor-pointer rounded-sm hover:bg-accent/30 transition-colors duration-200 h-6',
                        id === selectedModelId &&
                          !isLocked &&
                          'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="text-[6px] font-medium truncate flex-1">
                          {chatModel.name}
                        </div>
                        {isLocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaywallOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800 text-[5px] px-1 py-0.5 h-4"
                          >
                            Upgrade
                          </Button>
                        )}
                      </div>
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">{chatModel.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
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

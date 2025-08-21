'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatMode = 'agent' | 'chat';

export function ChatModeSelector({
  className,
  selectedMode,
  onModeChange,
}: {
  className?: string;
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}) {
  const handleToggle = () => {
    const newMode = selectedMode === 'chat' ? 'agent' : 'chat';
    onModeChange(newMode);
  };

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      className={cn(
        'flex items-center px-2 h-6 rounded-sm text-xs text-accent-foreground bg-background/30 hover:bg-accent/30 transition-colors duration-200 border border-border/30 opacity-60 hover:opacity-100',
        selectedMode === 'agent' &&
          'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:text-cyan-800 dark:hover:text-cyan-200 border border-cyan-200 dark:border-cyan-800',
        className,
      )}
    >
      <span>
        {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}
      </span>
    </Button>
  );
}

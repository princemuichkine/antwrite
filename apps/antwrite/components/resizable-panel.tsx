'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSidebarWithSide } from '@/components/ui/sidebar';

interface ResizablePanelProps {
  children: ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  side?: 'left' | 'right';
}

export function ResizablePanel({
  children,
  defaultSize = 400,
  minSize = 300,
  maxSize = 600,
  className,
  side = 'right',
}: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);

  const { open: isOpen, setOpen: setSidebarOpen } = useSidebarWithSide(side);

  // Handle mouse down on resize handle
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Save size to localStorage
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem(`resizable-panel-size-${side}`);
      if (savedSize) {
        const parsedSize = Number.parseInt(savedSize);
        if (
          !Number.isNaN(parsedSize) &&
          parsedSize >= minSize &&
          parsedSize <= maxSize
        ) {
          setSize(parsedSize);
        }
      }
    } catch (error) {
      console.error('Failed to load size from localStorage:', error);
    }
  }, [minSize, maxSize, side]);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate the new width based on side of the panel
      let newSize: number;
      if (side === 'right') {
        newSize = window.innerWidth - e.clientX;
      } else {
        newSize = e.clientX;
      }

      // Check if panel should be closed (when dragged very small)
      const closeThreshold = 100; // Close panel if dragged smaller than 100px
      if (newSize < closeThreshold) {
        setSidebarOpen(false);
        return;
      }

      // Apply constraints
      const constrainedSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(constrainedSize);

      // Save to localStorage
      try {
        localStorage.setItem(
          `resizable-panel-size-${side}`,
          constrainedSize.toString(),
        );
      } catch (error) {
        console.error('Failed to save size to localStorage:', error);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Add cursor styling to body when resizing
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minSize, maxSize, side, setSidebarOpen]);

  return (
    <div className="flex flex-row h-full">
      {/* Left side panel */}
      {side === 'left' && (
        <div
          className={cn('h-full shrink-0', className)}
          style={{ width: `${size}px` }}
        >
          {children}
        </div>
      )}

      {/* Resize handle - always visible for better UX */}
      <div
        role="button"
        tabIndex={0}
        onMouseDown={startResizing}
        onDoubleClick={() => isOpen && setSidebarOpen(false)}
        className={cn(
          'group relative flex w-2.5 cursor-col-resize items-center justify-center rounded-[2px] mt-0.5 mb-0.5',
          'transition-colors',
          isResizing
            ? 'bg-primary/30'
            : 'hover:bg-primary/10 dark:hover:bg-primary/20',
        )}
      >
        <GripVertical
          className={cn(
            'size-4 text-muted-foreground/40 transition-colors',
            isResizing
              ? 'text-primary'
              : 'group-hover:text-primary/80 dark:group-hover:text-primary',
          )}
        />
      </div>

      {side === 'right' && (
        <>
          <div
            className="relative h-full bg-transparent transition-all duration-200 ease-linear"
            style={{ width: isOpen ? `${size}px` : '0px' }}
          />
          <div
            className={cn(
              'fixed top-0 h-full transition-all duration-200 ease-linear',
              className,
            )}
            style={{
              width: `${size}px`,
              right: isOpen ? '0px' : `-${size}px`,
            }}
          >
            <div className="size-full">
              {children}
            </div>
          </div>

          {/* Invisible clickable area when collapsed */}
          {!isOpen && (
            <div
              className="fixed top-0 h-full w-2.5 cursor-pointer transition-all duration-200 ease-linear z-10 hover:bg-primary/10 dark:hover:bg-primary/20"
              style={{ right: '0px' }}
              onClick={() => setSidebarOpen(true)}
            />
          )}
        </>
      )}
    </div>
  );
}

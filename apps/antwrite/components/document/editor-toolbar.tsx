'use client';

import React, { useState } from 'react';
import { toggleMark, setBlockType } from 'prosemirror-commands';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { List, ListOrdered, Bold, Italic, Underline, ChevronDown, Palette, Image } from 'lucide-react';
import { documentSchema } from '@/lib/editor/config';
import { getActiveEditorView } from '@/lib/editor/editor-state';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EditorState } from 'prosemirror-state';
import type { FormatState } from '@/lib/editor/format-plugin';

const { nodes, marks } = documentSchema;

const applyMark = (markType: any, attrs?: any) => (state: EditorState, dispatch: any) => {
  const { from, to } = state.selection;
  const tr = state.tr.addMark(from, to, markType.create(attrs));
  dispatch(tr);
  return true;
};

const applyTextColor = (color: string) => (state: EditorState, dispatch: any) => {
  const { from, to } = state.selection;
  const tr = state.tr.addMark(from, to, marks.textColor.create({ color }));
  dispatch(tr);
  return true;
};

function runCommand(command: (state: any, dispatch?: any) => boolean) {
  const view = getActiveEditorView();
  if (!view) return;
  command(view.state, view.dispatch);
  view.focus();
}

interface EditorToolbarProps {
  activeFormats: FormatState;
}

export function EditorToolbar({ activeFormats }: EditorToolbarProps) {
  const view = getActiveEditorView();
  const textContent = view?.state.doc.textContent || '';
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const textOptions: {
    label: string;
    formatKey: keyof typeof activeFormats;
    command: () => void;
  }[] = [
      {
        label: 'Heading 1',
        formatKey: 'h1',
        command: () => runCommand(setBlockType(nodes.heading, { level: 1 })),
      },
      {
        label: 'Heading 2',
        formatKey: 'h2',
        command: () => runCommand(setBlockType(nodes.heading, { level: 2 })),
      },
      {
        label: 'Paragraph',
        formatKey: 'p',
        command: () => runCommand(setBlockType(nodes.paragraph)),
      },
    ];

  const fontFamilies = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia"];
  const fontSizes = ["10px", "11px", "12px", "14px", "18px", "24px"];
  const textColors = [
    '#FFFFFF', '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#374151', '#111827', '#000000', // grays + white
    '#DC2626', '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3', '#DB2777', // warm colors
    '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6' // additional colors
  ];

  const ButtonWithTooltip = ({
    label,
    children,
    onClick,
    formatKey,
  }: {
    label: string;
    children: React.ReactNode;
    onClick: () => void;
    formatKey?: keyof FormatState;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 w-8 min-w-8 max-w-8 p-0 flex items-center justify-center rounded-sm border border-border bg-background text-foreground shrink-0',
            formatKey && activeFormats[formatKey]
              ? 'border-accent bg-accent text-accent-foreground'
              : '',
            'transition-none',
          )}
          onClick={onClick}
          type="button"
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="toolbar sticky top-4 z-20 w-full h-[45px] flex items-center gap-2 px-3 py-0 overflow-x-auto whitespace-nowrap rounded-sm bg-background border border-border">
      {/* Toolbar left side */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-3 min-w-28 flex items-center justify-between gap-2 text-sm rounded-sm border border-border bg-background text-foreground shrink-0"
            tabIndex={0}
          >
            <span className="truncate text-sm font-medium">
              {activeFormats.h1
                ? 'Heading 1'
                : activeFormats.h2
                  ? 'Heading 2'
                  : 'Paragraph'}
            </span>
            <ChevronDown className="size-4 ml-1 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 p-1 shadow-lg rounded-sm border bg-popover"
          align="start"
        >
          {textOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.label}
              onSelect={(e) => {
                e.preventDefault();
                opt.command();
              }}
              className={cn(
                'text-sm rounded-sm',
                opt.formatKey &&
                activeFormats[opt.formatKey] &&
                'bg-accent text-accent-foreground',
              )}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-3 min-w-28 flex items-center justify-between gap-2 text-sm rounded-sm border border-border bg-background text-foreground shrink-0"
          >
            <span style={{ fontFamily: activeFormats.fontFamily }}>{activeFormats.fontFamily}</span>
            <ChevronDown className="size-4 ml-1 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 p-1 shadow-lg rounded-sm border bg-popover"
          align="start"
        >
          {fontFamilies.map((font) => (
            <DropdownMenuItem
              key={font}
              onSelect={() => runCommand(applyMark(marks.fontFamily, { fontFamily: font }))}
            >
              <span style={{ fontFamily: font }}>{font}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-3 min-w-16 flex items-center justify-between gap-2 text-sm rounded-sm border border-border bg-background text-foreground shrink-0"
          >
            <span>{activeFormats.fontSize?.replace('px', '')}</span>
            <ChevronDown className="size-4 ml-1 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-20 p-1 shadow-lg rounded-sm border bg-popover"
          align="start"
        >
          {fontSizes.map((size) => (
            <DropdownMenuItem
              key={size}
              onSelect={() => runCommand(applyMark(marks.fontSize, { fontSize: size }))}
            >
              <span>{size.replace('px', '')}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-8 w-8 min-w-8 max-w-8 p-0 flex items-center justify-center rounded-sm border border-border bg-background text-foreground shrink-0',
              'transition-none',
            )}
            type="button"
            aria-label="Text color"
          >
            <Palette className="size-4 text-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-42 p-3 pr-2" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Text Color</div>
            <div className="grid grid-cols-5 gap-1">
              {textColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-5 h-5 rounded border-2 border-transparent hover:border-ring transition-colors',
                    activeFormats.textColor === color && 'border-ring'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => runCommand(applyTextColor(color))}
                  type="button"
                  aria-label={`Text color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <button
                className="size-6 rounded border border-border overflow-hidden cursor-pointer relative"
                style={{ backgroundColor: activeFormats.textColor }}
                onClick={(e) => {
                  // Find and click the hidden input
                  const input = e.currentTarget.querySelector('input[type="color"]') as HTMLInputElement;
                  input?.click();
                }}
                aria-label="Custom text color"
              >
                <input
                  type="color"
                  value={activeFormats.textColor}
                  onChange={(e) => runCommand(applyTextColor(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Custom text color picker"
                />
              </button>
              <span className="text-xs text-muted-foreground">Custom</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <ButtonWithTooltip
        label="Insert image"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = false;

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Validate file size (max 5MB for base64)
            if (file.size > 5 * 1024 * 1024) {
              console.error('Image too large. Max 5MB allowed.');
              return;
            }

            try {
              // Convert to base64
              const reader = new FileReader();
              reader.onload = () => {
                const base64Data = reader.result as string;

                const view = getActiveEditorView();
                if (!view) return;

                const { state } = view;
                const { schema } = state;
                const imageNode = schema.nodes.image.create({
                  src: base64Data,
                  alt: file.name,
                });

                const tr = state.tr.replaceSelectionWith(imageNode);
                view.dispatch(tr);
                view.focus();
              };

              reader.onerror = () => {
                console.error('Failed to read image file');
              };

              reader.readAsDataURL(file);
            } catch (error) {
              console.error('Image processing failed:', error);
            }
          };

          input.click();
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image className="size-5 text-foreground" />
      </ButtonWithTooltip>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <ButtonWithTooltip
        label="Bullet list"
        formatKey="bulletList"
        onClick={() =>
          activeFormats.bulletList
            ? runCommand(liftListItem(nodes.list_item))
            : runCommand(wrapInList(nodes.bullet_list))
        }
      >
        <List className="size-5 text-foreground" />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        label="Numbered list"
        formatKey="orderedList"
        onClick={() =>
          activeFormats.orderedList
            ? runCommand(liftListItem(nodes.list_item))
            : runCommand(wrapInList(nodes.ordered_list))
        }
      >
        <ListOrdered className="size-5 text-foreground" />
      </ButtonWithTooltip>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <ButtonWithTooltip
        label="Bold"
        formatKey="bold"
        onClick={() => runCommand(toggleMark(marks.strong))}
      >
        <Bold className="size-5 text-foreground" />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        label="Underline"
        formatKey="underline"
        onClick={() => runCommand(toggleMark(marks.underline))}
      >
        <Underline className="size-5 text-foreground" />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        label="Italic"
        formatKey="italic"
        onClick={() => runCommand(toggleMark(marks.em))}
      >
        <Italic className="size-5 text-foreground" />
      </ButtonWithTooltip>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <ButtonWithTooltip
        label="Grammar"
        onClick={() => {
          // TODO: Implement grammar correction functionality
          console.log('Grammar correction triggered');
        }}
      >
        <LottieIcon
          animationData={animations.checkmark}
          size={19}
          className="text-foreground"
        />
      </ButtonWithTooltip>

      <div className="flex-1" />
      <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap pr-2">
        {wordCount} word{wordCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}

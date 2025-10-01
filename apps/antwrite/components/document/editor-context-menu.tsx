'use client';

import React, { useCallback } from 'react';
import { Scissors, Copy, ClipboardPaste, Trash2, Link, Image, AlignLeft, AlignCenter, AlignRight, MousePointer } from 'lucide-react';
import { getActiveEditorView } from '@/lib/editor/editor-state';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface EditorContextMenuProps {
    children: React.ReactNode;
    selection?: { from: number; to: number };
    onSelectionClear?: () => void;
}

function runCommand(command: (state: any, dispatch?: any) => boolean) {
    const view = getActiveEditorView();
    if (!view) return;
    command(view.state, view.dispatch);
    view.focus();
}

function handleCut() {
    document.execCommand('cut');
}

function handleCopy() {
    document.execCommand('copy');
}

function handlePaste() {
    document.execCommand('paste');
}

function handleDelete() {
    const view = getActiveEditorView();
    if (!view) return;

    const { state } = view;
    const { from, to } = state.selection;

    if (from !== to) {
        const tr = state.tr.delete(from, to);
        view.dispatch(tr);
    }
    view.focus();
}

async function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    return new Promise<void>((resolve) => {
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve();
                return;
            }

            // Validate file size (max 5MB for base64)
            if (file.size > 5 * 1024 * 1024) {
                console.error('Image too large. Max 5MB allowed.');
                resolve();
                return;
            }

            try {
                // Convert to base64
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Data = reader.result as string;

                    // Insert the image into the editor
                    const view = getActiveEditorView();
                    if (!view) {
                        resolve();
                        return;
                    }

                    const { state } = view;
                    const { schema } = state;
                    const imageNode = schema.nodes.image.create({
                        src: base64Data,
                        alt: file.name,
                    });

                    const tr = state.tr.replaceSelectionWith(imageNode);
                    view.dispatch(tr);
                    view.focus();
                    resolve();
                };

                reader.onerror = () => {
                    console.error('Failed to read image file');
                    resolve();
                };

                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Image processing failed:', error);
                resolve();
            }
        };

        input.click();
    });
}

function isImageSelected(selection?: { from: number; to: number }): boolean {
    const view = getActiveEditorView();
    if (!view || !selection) return false;

    const { from, to } = selection;

    if (from === to) return false;

    let hasImage = false;
    view.state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === 'image') {
            hasImage = true;
            return false;
        }
    });

    return hasImage;
}

function getSelectedImageAlign(selection?: { from: number; to: number }): string {
    const view = getActiveEditorView();
    if (!view || !selection) return 'left';

    const { from } = selection;

    const node = view.state.doc.nodeAt(from);
    if (node && node.type.name === 'image') {
        return node.attrs.align || 'left';
    }

    return 'left';
}

function setImageAlignment(alignment: string, selection?: { from: number; to: number }) {
    const view = getActiveEditorView();
    if (!view || !selection) return;

    const { from } = selection;

    const node = view.state.doc.nodeAt(from);
    if (node && node.type.name === 'image') {
        const tr = view.state.tr.setNodeMarkup(from, null, {
            ...node.attrs,
            align: alignment,
        });
        view.dispatch(tr);
        view.focus();
    }
}

export function EditorContextMenu({ children, selection, onSelectionClear }: EditorContextMenuProps) {
    const handleFormatCommand = useCallback((command: () => void) => {
        command();
    }, []);

    const handleClipboardCommand = useCallback((command: () => void) => {
        command();
    }, []);

    const showImageAlignment = selection ? isImageSelected(selection) : false;

    return (
        <ContextMenu
            modal={false}
            onOpenChange={(open) => {
                if (!open && onSelectionClear) {
                    onSelectionClear();
                }
            }}
        >
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                {/* Selection & Clipboard Actions */}
                <ContextMenuItem
                    onSelect={() => handleClipboardCommand(() => document.execCommand('selectAll'))}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <MousePointer className="mr-2 size-4" />
                    <span>Select All</span>
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+A</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onSelect={() => handleClipboardCommand(handleCut)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Scissors className="mr-2 size-4" />
                    <span>Cut</span>
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+X</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={() => handleClipboardCommand(handleCopy)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Copy className="mr-2 size-4" />
                    <span>Copy</span>
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={() => handleClipboardCommand(handlePaste)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ClipboardPaste className="mr-2 size-4" />
                    <span>Paste</span>
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                {/* Links & Media */}
                <ContextMenuItem
                    onSelect={() => handleFormatCommand(() => console.log('Insert link'))}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Link className="mr-2 size-4" />
                    <span>Link</span>
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+K</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={() => handleImageUpload()}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="mr-2 size-4" />
                    <span>Image</span>
                </ContextMenuItem>

                {/* Image Alignment - only show when image is selected */}
                {showImageAlignment && (
                    <>
                        <ContextMenuSeparator />

                        <ContextMenuItem
                            onSelect={() => setImageAlignment('left', selection)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={getSelectedImageAlign(selection) === 'left' ? 'bg-accent' : ''}
                        >
                            <AlignLeft className="mr-2 size-4" />
                            <span>Align Left</span>
                        </ContextMenuItem>
                        <ContextMenuItem
                            onSelect={() => setImageAlignment('center', selection)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={getSelectedImageAlign(selection) === 'center' ? 'bg-accent' : ''}
                        >
                            <AlignCenter className="mr-2 size-4" />
                            <span>Align Center</span>
                        </ContextMenuItem>
                        <ContextMenuItem
                            onSelect={() => setImageAlignment('right', selection)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={getSelectedImageAlign(selection) === 'right' ? 'bg-accent' : ''}
                        >
                            <AlignRight className="mr-2 size-4" />
                            <span>Align Right</span>
                        </ContextMenuItem>
                    </>
                )}

                <ContextMenuSeparator />

                {/* Text Alignment */}
                <ContextMenuItem
                    onSelect={() => handleFormatCommand(() => console.log('Align left'))}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <AlignLeft className="mr-2 size-4" />
                    <span>Align Left</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={() => handleFormatCommand(() => console.log('Align center'))}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <AlignCenter className="mr-2 size-4" />
                    <span>Align Center</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={() => handleFormatCommand(() => console.log('Align right'))}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <AlignRight className="mr-2 size-4" />
                    <span>Align Right</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onSelect={() => handleClipboardCommand(handleDelete)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <Trash2 className="mr-2 size-4" />
                    <span>Delete</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

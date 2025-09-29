'use client';

import {
  EditorState,
  type Transaction,
  TextSelection,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, {
  memo,
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  buildContentFromDocument,
  buildDocumentFromContent,
} from '@/lib/editor/functions';
import { setActiveEditorView } from '@/lib/editor/editor-state';
import { EditorToolbar } from '@/components/document/editor-toolbar';
import { EditorContextMenu } from '@/components/document/editor-context-menu';
import {
  savePluginKey,
  setSaveStatus,
  createForceSaveHandler,
  type SaveState,
} from '@/lib/editor/save-plugin';
import { createEditorPlugins } from '@/lib/editor/editor-plugins';
import type { FormatState } from '@/lib/editor/format-plugin';
import {
  inlineSuggestionPluginKey,
  createInlineSuggestionCallback,
} from '@/lib/editor/inline-suggestion-plugin';

const PAGE_HEIGHT = 1056;
const PAGE_GAP = 24;
const PAGE_PADDING = 96;

// Image drop handler
async function handleImageDrop(view: EditorView, file: File) {
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
}

type EditorProps = {
  content: string;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  documentId: string;
  initialLastSaved: Date | null;
  zoom: number;
  onStatusChange?: (status: SaveState) => void;
  onCreateDocumentRequest?: (initialContent: string) => void;
};

function PureEditor({
  content,
  status,
  isCurrentVersion,
  currentVersionIndex,
  documentId,
  initialLastSaved,
  zoom,
  onStatusChange,
  onCreateDocumentRequest,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const currentDocumentIdRef = useRef(documentId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [pages, setPages] = useState(1);

  const [activeFormats, setActiveFormats] = useState<FormatState>({
    h1: false,
    h2: false,
    p: false,
    bulletList: false,
    orderedList: false,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    fontFamily: 'Arial',
    fontSize: '11px',
    textColor: '#000000',
  });

  const [contextMenuSelection, setContextMenuSelection] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    currentDocumentIdRef.current = documentId;
  }, [documentId]);

  const performSave = useCallback(
    async (contentToSave: string) => {
      const docId = currentDocumentIdRef.current;
      if (
        !docId ||
        docId === 'init' ||
        docId === 'undefined' ||
        docId === 'null'
      ) {
        console.warn(
          '[Save Function] Attempted to save with invalid or init documentId:',
          docId,
        );
        return null;
      }

      try {
        const response = await fetch('/api/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: docId, content: contentToSave }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || response.statusText);
        }

        const data = await response.json();
        return { updatedAt: data.updatedAt || new Date().toISOString() };
      } catch (error) {
        console.error('[Save Function] Error saving document:', error);
        throw error;
      }
    },
    [currentDocumentIdRef],
  );

  const requestInlineSuggestion = useMemo(
    () => createInlineSuggestionCallback(documentId),
    [documentId],
  );

  useEffect(() => {
    let view: EditorView | null = null;
    if (containerRef.current && !editorRef.current) {
      const plugins = createEditorPlugins({
        documentId,
        initialLastSaved,
        performSave,
        requestInlineSuggestion: (state) => {
          requestInlineSuggestion(state, abortControllerRef, editorRef);
        },
        setActiveFormats,
      });

      const initialEditorState = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: plugins,
      });

      view = new EditorView(containerRef.current, {
        state: initialEditorState,
        handleDOMEvents: {
          focus: (view) => {
            setActiveEditorView(view);
            return false;
          },
          blur: () => false,
          mousedown: (view, event) => {
            // Handle clicks in empty areas of the editor
            const target = event.target as HTMLElement;
            const editorElement = view.dom;
            const proseMirrorElement =
              editorElement.querySelector('.ProseMirror');


            // Check if clicking in empty space (below content or in padding)
            const rect = editorElement.getBoundingClientRect();
            const clickY = event.clientY;
            const contentHeight = proseMirrorElement?.scrollHeight || 0;
            const isClickingInEmptySpace =
              clickY > rect.top + contentHeight + 20; // 20px buffer

            // If clicking on the editor container itself, in empty space, or outside ProseMirror content
            if (
              target === editorElement ||
              isClickingInEmptySpace ||
              (proseMirrorElement && !proseMirrorElement.contains(target))
            ) {
              const endPos = view.state.doc.content.size;
              const resolvedPos = view.state.doc.resolve(endPos);
              const textSelection = TextSelection.near(resolvedPos);
              const tr = view.state.tr.setSelection(textSelection);
              view.dispatch(tr);
              view.focus();
              return true; // Prevent default ProseMirror behavior
            }
            return false;
          },
          drop: (view, event) => {
            view.dom.parentElement?.classList.remove('drag-over');
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
              event.preventDefault();
              const file = files[0];
              if (file.type.startsWith('image/')) {
                handleImageDrop(view, file);
                return true;
              }
            }
            return false;
          },
          dragover: (view, event) => {
            const files = event.dataTransfer?.files;
            if (files && files.length > 0 && files[0].type.startsWith('image/')) {
              event.preventDefault();
              view.dom.parentElement?.classList.add('drag-over');
              return true;
            }
            view.dom.parentElement?.classList.remove('drag-over');
            return false;
          },
          dragleave: (view, event) => {
            // Only remove the class if we're actually leaving the editor area
            const rect = view.dom.parentElement?.getBoundingClientRect();
            if (rect) {
              const { clientX, clientY } = event;
              if (clientX < rect.left || clientX > rect.right ||
                clientY < rect.top || clientY > rect.bottom) {
                view.dom.parentElement?.classList.remove('drag-over');
              }
            }
            return false;
          },
          paste: (view, event) => {
            const files = event.clipboardData?.files;
            if (files && files.length > 0) {
              const file = files[0];
              if (file.type.startsWith('image/')) {
                event.preventDefault();
                handleImageDrop(view, file);
                return true;
              }
            }
            return false;
          },
          contextmenu: (view, event) => {
            // Capture the current selection for the context menu
            const { from, to } = view.state.selection;
            setContextMenuSelection({ from, to });
            return true;
          },
        },
        dispatchTransaction: (transaction: Transaction) => {
          if (!editorRef.current) return;
          const editorView = editorRef.current;

          const oldEditorState = editorView.state;
          const oldSaveState = savePluginKey.getState(oldEditorState);
          const newState = editorView.state.apply(transaction);
          editorView.updateState(newState);

          const newSaveState = savePluginKey.getState(newState);
          if (onStatusChange && newSaveState && newSaveState !== oldSaveState) {
            onStatusChange(newSaveState);
          }

          // Dispatch content change event for offline versioning
          if (transaction.docChanged) {
            const newContent = buildContentFromDocument(newState.doc);
            window.dispatchEvent(new CustomEvent('editor:content-changed', {
              detail: { documentId, content: newContent }
            }));
          }

          if (
            newSaveState?.createDocument &&
            newSaveState.initialContent &&
            onCreateDocumentRequest
          ) {
            onCreateDocumentRequest(newSaveState.initialContent);
            setTimeout(() => {
              if (editorView) {
                setSaveStatus(editorView, { createDocument: false });
              }
            }, 0);
          }
        },
      });

      editorRef.current = view;
      setActiveEditorView(view);

      // Set up a resize observer to detect content height changes
      resizeObserverRef.current = new ResizeObserver(() => {
        if (editorRef.current) {
          const editorHeight = editorRef.current.dom.scrollHeight;
          const newPages = Math.max(
            1,
            Math.ceil(editorHeight / PAGE_HEIGHT),
          );
          setPages((p) => (newPages !== p ? newPages : p));
        }
      });
      resizeObserverRef.current.observe(view.dom);

      const initialSaveState = savePluginKey.getState(view.state);
      if (onStatusChange && initialSaveState) {
        onStatusChange(initialSaveState);
      }
    } else if (editorRef.current) {
      const currentView = editorRef.current;

      if (documentId !== currentDocumentIdRef.current) {
        const newPlugins = createEditorPlugins({
          documentId,
          initialLastSaved,
          performSave,
          requestInlineSuggestion: (state) => {
            console.log(
              '[Text Editor] Plugin requesting suggestion (document change), calling callback',
            );
            requestInlineSuggestion(state, abortControllerRef, editorRef);
          },
          setActiveFormats,
        });

        const newDoc = buildDocumentFromContent(content);
        const newState = EditorState.create({
          doc: newDoc,
          plugins: newPlugins,
        });
        currentView.updateState(newState);
      } else {
        const currentContent = buildContentFromDocument(currentView.state.doc);
        if (content !== currentContent) {
          const saveState = savePluginKey.getState(currentView.state);
          if (saveState?.isDirty) {
            console.warn(
              '[Editor] External content update received, but editor is dirty. Ignoring update.',
            );
          } else {
            const newDocument = buildDocumentFromContent(content);
            const transaction = currentView.state.tr.replaceWith(
              0,
              currentView.state.doc.content.size,
              newDocument.content,
            );
            transaction.setMeta('external', true);
            transaction.setMeta('addToHistory', false);
            currentView.dispatch(transaction);
          }
        }
      }

      currentView.setProps({
        editable: () => isCurrentVersion,
      });
    }

    return () => {
      if (view) {
        view.destroy();
        if (editorRef.current === view) {
          editorRef.current = null;
        }
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [
    content,
    documentId,
    initialLastSaved,
    isCurrentVersion,
    performSave,
    onStatusChange,
    onCreateDocumentRequest,
    requestInlineSuggestion,
  ]);

  useEffect(() => {
    const handleCreationStreamFinished = (event: CustomEvent) => {
      const finishedDocId = event.detail.documentId;
      const editorView = editorRef.current;
      const currentEditorPropId = documentId;

      if (
        editorView &&
        finishedDocId === currentEditorPropId &&
        currentEditorPropId !== 'init'
      ) {
        const saveState = savePluginKey.getState(editorView.state);
        if (
          saveState &&
          saveState.status !== 'saving' &&
          saveState.status !== 'debouncing'
        ) {
          setSaveStatus(editorView, { triggerSave: true });
        }
      }
    };

    const handleForceSave = createForceSaveHandler(currentDocumentIdRef);
    const wrappedForceSave = async (event: CustomEvent) => {
      const editorView = editorRef.current;
      if (!editorView) return;

      try {
        const content = buildContentFromDocument(editorView.state.doc);
        const result = await handleForceSave({
          ...event,
          detail: { ...event.detail, content },
        });

        if (result && editorView) {
          setSaveStatus(editorView, result);
        }
      } catch (error) {
        console.error('Force save failed:', error);
      }
    };

    const handleForceContentUpdate = (event: CustomEvent) => {
      const { documentId: targetDocId, content } = event.detail;
      if (targetDocId === documentId && content !== undefined) {
        // Force update the editor content
        if (editorRef.current) {
          const newDoc = buildDocumentFromContent(content);
          const transaction = editorRef.current.state.tr.replaceWith(
            0,
            editorRef.current.state.doc.content.size,
            newDoc.content
          );
          transaction.setMeta('external', true);
          transaction.setMeta('addToHistory', false);
          editorRef.current.dispatch(transaction);
        }
      }
    };

    window.addEventListener(
      'editor:creation-stream-finished',
      handleCreationStreamFinished as EventListener,
    );
    window.addEventListener(
      'editor:force-save-document',
      wrappedForceSave as unknown as EventListener,
    );
    window.addEventListener(
      'editor:force-content-update',
      handleForceContentUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        'editor:creation-stream-finished',
        handleCreationStreamFinished as EventListener,
      );
      window.removeEventListener(
        'editor:force-save-document',
        wrappedForceSave as unknown as EventListener,
      );
      window.removeEventListener(
        'editor:force-content-update',
        handleForceContentUpdate as EventListener,
      );
    };
  }, [documentId]);

  return (
    <div
      className="transition-transform duration-150 ease-in-out"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      }}
    >
      <div className="max-w-[816px] w-full mx-auto relative px-4 min-w-[400px]">
        <div
          className="absolute top-0 inset-x-4 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-950 shadow-lg rounded-sm"
              style={{
                height: `${PAGE_HEIGHT}px`,
                marginBottom: `${PAGE_GAP}px`,
              }}
            />
          ))}
        </div>
        <div className="relative">
          {isCurrentVersion && documentId !== 'init' && (
            <EditorToolbar activeFormats={activeFormats} />
          )}
          <EditorContextMenu
            selection={contextMenuSelection || undefined}
            onSelectionClear={() => setContextMenuSelection(null)}
          >
            <div
              className="editor-area bg-transparent text-foreground dark:text-white prose prose-slate dark:prose-invert pt-4 min-h-[400px] cursor-text"
              style={{ padding: `${PAGE_PADDING}px` }}
              ref={containerRef}
            />
          </EditorContextMenu>
        </div>
      </div>
      <style jsx global>{`
        .suggestion-decoration-inline::after {
          content: attr(data-suggestion);
          color: inherit;
          opacity: 0.5;
          pointer-events: none;
          user-select: none;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          white-space: pre-wrap;
          vertical-align: initial;
        }

        .ProseMirror .is-placeholder-empty::before {
          content: attr(data-placeholder);
          position: absolute;
          left: 0;
          top: 0;
          color: #adb5bd;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          pointer-events: none;
          user-select: none;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .inline-suggestion-loader {
          display: inline-block;
          width: 1.5px;
          height: 1.2em;
          background-color: currentColor;
          animation: inline-suggestion-caret-pulse 1.1s infinite;
          vertical-align: text-bottom;
          opacity: 0.5;
        }

        @keyframes inline-suggestion-caret-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.1; }
        }

        .suggestion-context-highlight {
          background-color: rgba(255, 255, 0, 0.25);
          transition: background-color 0.3s ease-in-out;
        }

        .suggestion-context-loading {
          background-color: rgba(255, 220, 0, 0.35);
          animation: pulse-animation 1.5s infinite ease-in-out;
        }

        @keyframes pulse-animation {
          0% { background-color: rgba(255, 220, 0, 0.35); }
          50% { background-color: rgba(255, 230, 80, 0.5); }
          100% { background-color: rgba(255, 220, 0, 0.35); }
        }

        [data-diff] {
          transition: background-color 0.5s ease-in-out, color 0.5s ease-in-out, opacity 0.5s ease-in-out, max-height 0.5s ease-in-out;
        }

        .applying-changes [data-diff="1"] {
          background-color: transparent;
        }

        .applying-changes [data-diff="-1"] {
          text-decoration: none;
          opacity: 0;
          overflow: hidden;
          max-height: 0;
        }

        .editor-area,
        .toolbar {
          max-width: 100%;
          margin: 0 auto;
        }

        .editor-area {
          min-height: ${PAGE_HEIGHT - PAGE_PADDING * 2}px;
          position: relative;
          cursor: text;
        }

        .editor-area .ProseMirror {
          min-height: inherit;
          outline: none;
        }

        /* Ensure empty space is clickable */
        .editor-area::after {
          content: '';
          display: block;
          min-height: 400px;
          pointer-events: auto;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
        }

        @media (min-width: 1024px) {
          .editor-area,
          .toolbar {
            max-width: 100%;
          }
        }

        @media (min-width: 1280px) {
          .editor-area,
          .toolbar {
            max-width: 100%;
          }
        }

        @media (min-width: 1536px) {
          .editor-area,
          .toolbar {
            max-width: 100%;
          }
        }

        /* --- Synonym plugin styles (hover with Shift) --- */
        div.ProseMirror { position: relative; }

        .synonym-word { display: inline; }
        .synonym-word.synonym-loading { position: relative; display: inline-block; }

        .synonym-overlay-menu {
          background: #282c34;
          color: #fff;
          border: none;
          padding: 4px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          gap: 4px;
          z-index: 10000;
        }

        .synonym-overlay-menu .synonym-option {
          background: none;
          border: none;
          padding: 2px 6px;
          cursor: pointer;
          font: inherit;
          color: inherit;
          border-radius: 4px;
        }

        .synonym-overlay-menu .synonym-option:hover {
          background: rgba(255,255,255,0.1);
        }

        /* Loading overlay on the word while fetching synonyms */
        .synonym-loading::before {
          content: "";
          position: absolute;
          inset: 0;
          background-color: rgba(100,100,100,0.2);
          border-radius: 4px;
          pointer-events: none;
          z-index: 1;
        }

        /* Emoji plugin styles */
        .emoji-widget {
          display: inline;
          font-size: 1.2em;
          vertical-align: middle;
          line-height: 1;
          margin: 0 1px;
        }

        .emoji-hidden {
          display: none;
        }

        /* Ensure emojis render properly */
        .ProseMirror {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        }

        /* Image styles */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 8px 0;
          display: block;
        }

        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid #68CEF8;
        }

        /* Drag and drop styles */
        .editor-area.drag-over {
          background-color: rgba(104, 206, 248, 0.1);
          border: 2px dashed #68CEF8;
        }

        /* Emoji suggestion panel styles */
        .emoji-suggestion-panel {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: rgb(0 0 0);
          color: rgb(255 255 255);
          border-color: rgb(55 65 81);
        }

        .emoji-suggestion-panel:focus {
          outline: 2px solid rgb(59 130 246);
          outline-offset: 2px;
        }

        .emoji-suggestion-panel .emoji-suggestion-header {
          color: rgb(255 255 255);
        }

        .emoji-suggestion-panel .emoji-suggestion-item {
          color: rgb(255 255 255);
        }

        .emoji-suggestion-panel .emoji-suggestion-item:hover {
          background-color: rgb(55 65 81);
        }

        .emoji-suggestion-panel .emoji-suggestion-item.selected {
          background-color: rgb(55 65 81);
        }

        .emoji-suggestion-panel .emoji-suggestion-shortcuts {
          color: rgb(156 163 175);
          opacity: 0.8;
        }

        .emoji-suggestion-panel::-webkit-scrollbar {
          height: 6px;
        }

        .emoji-suggestion-panel::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }

        .emoji-suggestion-panel::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }

        .emoji-suggestion-panel::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.documentId === nextProps.documentId &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.zoom === nextProps.zoom
  );
}

export const Editor = memo(PureEditor, areEqual);

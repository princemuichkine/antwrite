import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { buildContentFromDocument } from './functions';

export const savePluginKey = new PluginKey<SaveState>('save');

export type SaveStatus = 'idle' | 'debouncing' | 'saving' | 'error' | 'saved';

export interface SaveState {
  status: SaveStatus;
  lastSaved: Date | null;
  errorMessage: string | null;
  isDirty: boolean;
  createDocument?: boolean;
  initialContent?: string;
  triggerSave?: boolean;
}

interface SavePluginOptions {
  saveFunction: (
    content: string,
  ) => Promise<{ updatedAt: string | Date } | null>;
  debounceMs?: number;
  initialLastSaved?: Date | null;
  documentId: string;
}

export const INVALID_DOCUMENT_IDS = ['init', 'undefined', 'null'] as const;

export function isInvalidDocumentId(docId?: string | null): boolean {
  return (
    !docId ||
    INVALID_DOCUMENT_IDS.includes(
      docId as (typeof INVALID_DOCUMENT_IDS)[number],
    )
  );
}

export function createSaveFunction(
  currentDocumentIdRef: React.MutableRefObject<string>,
) {
  return async (
    contentToSave: string,
  ): Promise<{ updatedAt: string | Date } | null> => {
    const docId = currentDocumentIdRef.current;
    if (isInvalidDocumentId(docId)) {
      console.warn(
        '[Save Function] Attempted to save with invalid or init documentId:',
        docId,
      );
      throw new Error('Cannot save with invalid or initial document ID.');
    }

    try {
      const response = await fetch(`/api/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: docId,
          content: contentToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown API error' }));
        console.error(
          `[Save Function] Save failed: ${response.status}`,
          errorData,
        );
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      return { updatedAt: result.updatedAt || new Date().toISOString() };
    } catch (error) {
      console.error(`[Save Function] Error during save for ${docId}:`, error);
      throw error;
    }
  };
}

export function savePlugin({
  saveFunction,
  debounceMs = 500, // Reduced from 1500ms to 500ms for more frequent saves
  initialLastSaved = null,
  documentId,
}: SavePluginOptions): Plugin<SaveState> {
  let debounceTimeout: NodeJS.Timeout | null = null;
  let inflightRequest: Promise<any> | null = null;
  let editorViewInstance: EditorView | null = null;

  return new Plugin<SaveState>({
    key: savePluginKey,
    state: {
      init(_, state): SaveState {
        return {
          status: 'idle',
          lastSaved: initialLastSaved,
          errorMessage: null,
          isDirty: false,
          createDocument: false,
          initialContent: '',
        };
      },
      apply(tr, pluginState, oldState, newState): SaveState {
        const meta = tr.getMeta(savePluginKey);
        let shouldTriggerSave = false;
        let newPluginState = pluginState;
        if (meta) {
          if (meta.triggerSave === true) {
            shouldTriggerSave = true;
            meta.triggerSave = false;
          }
          if (meta.createDocument === false) {
            return { ...pluginState, ...meta, initialContent: '' };
          }
          newPluginState = { ...pluginState, ...meta };
        }

        if (!tr.docChanged && !shouldTriggerSave) {
          return newPluginState;
        }


        const wasEmpty = oldState.doc.content.size <= 2;
        if (
          documentId === 'init' &&
          tr.docChanged &&
          wasEmpty &&
          newState.doc.textContent.trim().length > 0
        ) {
          return {
            ...newPluginState,
            status: 'idle',
            isDirty: false,
            createDocument: true,
            initialContent: newState.doc.textContent,
            errorMessage: null,
          };
        }

        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }

        let newStatus: SaveStatus = 'debouncing';

        if (newPluginState.status === 'saving' && inflightRequest) {
          newStatus = 'saving';
        } else {
          newPluginState = { ...newPluginState, errorMessage: null };
        }

        const docActuallyChanged = tr.docChanged;

        debounceTimeout = setTimeout(() => {
          if (!editorViewInstance) {
            return;
          }
          const view = editorViewInstance;
          const currentState = savePluginKey.getState(view.state);

          if (!currentState || currentState.status !== 'debouncing') {
            return;
          }

          if (inflightRequest) {
            return;
          }

          setSaveStatus(view, { status: 'saving', isDirty: false });

          const contentToSave = buildContentFromDocument(view.state.doc);

          inflightRequest = saveFunction(contentToSave)
            .then((result) => {
              inflightRequest = null;
              setSaveStatus(view, {
                status: 'saved',
                lastSaved: result?.updatedAt
                  ? new Date(result.updatedAt)
                  : new Date(),
                errorMessage: null,
                isDirty: false,
              });
            })
            .catch((error) => {
              inflightRequest = null;
              console.error('[SavePlugin] Save failed:', error);
              setSaveStatus(view, {
                status: 'error',
                errorMessage:
                  error instanceof Error ? error.message : 'Unknown save error',
                isDirty: true,
              });
            });
        }, debounceMs);

        return {
          ...newPluginState,
          status: newStatus,
          isDirty: newPluginState.isDirty || docActuallyChanged,
        };
      },
    },
    view(editorView) {
      editorViewInstance = editorView;
      return {
        destroy() {
          editorViewInstance = null;
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
        },
      };
    },
  });
}

export function setSaveStatus(
  view: EditorView,
  statusUpdate: Partial<SaveState>,
) {
  const update =
    statusUpdate.createDocument === false
      ? { ...statusUpdate, initialContent: '' }
      : statusUpdate;
  view.dispatch(view.state.tr.setMeta(savePluginKey, update));
}

export function createForceSaveHandler(
  currentDocumentIdRef: React.MutableRefObject<string>,
) {
  return async (event: CustomEvent) => {
    const forceSaveDocId = event.detail.documentId;
    const currentEditorPropId = currentDocumentIdRef.current;

    if (
      forceSaveDocId !== currentEditorPropId ||
      isInvalidDocumentId(currentEditorPropId)
    ) {
      return;
    }

    try {
      const response = await fetch('/api/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentEditorPropId,
          content: event.detail.content || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        status: 'saved' as const,
        lastSaved: new Date(data.updatedAt || new Date().toISOString()),
        isDirty: false,
      };
    } catch (error) {
      console.error(
        `[Save Plugin] Force-save failed for ${currentEditorPropId}:`,
        error,
      );
      throw error;
    }
  };
}

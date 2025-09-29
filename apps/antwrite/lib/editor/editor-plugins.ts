import { exampleSetup } from 'prosemirror-example-setup';
import { inputRules } from 'prosemirror-inputrules';
import type { Plugin } from 'prosemirror-state';

import { documentSchema, headingRule } from './config';
import { creationStreamingPlugin } from './creation-streaming-plugin';
import { placeholderPlugin } from './placeholder-plugin';
import { inlineSuggestionPlugin } from './inline-suggestion-plugin';
import { selectionContextPlugin } from './suggestion-plugin';
import { synonymsPlugin } from './synonym-plugin';
import { diffPlugin } from './diff-plugin';
import { formatPlugin } from './format-plugin';
import { savePlugin } from './save-plugin';
import { emojiPlugin } from './emoji-plugin';

type EditorPluginsConfig = {
  documentId: string;
  initialLastSaved: Date | null;
  placeholder?: string;
  performSave: (content: string) => Promise<{ updatedAt: string } | null>;
  requestInlineSuggestion: (state: any) => void;
  setActiveFormats: (formats: any) => void;
};

export function createEditorPlugins({
  documentId,
  initialLastSaved,
  placeholder,
  performSave,
  requestInlineSuggestion,
  setActiveFormats,
}: EditorPluginsConfig): Plugin[] {
  return [
    creationStreamingPlugin(documentId),
    placeholderPlugin(
      placeholder ??
        (documentId === 'init' ? 'Start typing' : 'Start typing...'),
    ),
    ...exampleSetup({ schema: documentSchema, menuBar: false }),
    inputRules({
      rules: [1, 2, 3, 4, 5, 6].map((level) => headingRule(level)),
    }),
    inlineSuggestionPlugin({ requestSuggestion: requestInlineSuggestion }),
    selectionContextPlugin(documentId),
    synonymsPlugin(),
    diffPlugin(documentId),
    formatPlugin(setActiveFormats),
    emojiPlugin(),
    savePlugin({
      saveFunction: performSave,
      initialLastSaved: initialLastSaved,
      debounceMs: 200,
      documentId: documentId,
    }),
  ];
}

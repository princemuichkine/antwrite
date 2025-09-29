'use client';

import {
  defaultMarkdownSerializer,
  MarkdownSerializer,
} from 'prosemirror-markdown';
import { DOMParser, type Node } from 'prosemirror-model';
import { renderToString } from 'react-dom/server';

import { Markdown } from '@/components/markdown';
import { documentSchema } from './config';

export const buildDocumentFromContent = (content: string) => {
  const parser = DOMParser.fromSchema(documentSchema);
  const stringFromMarkdown = renderToString(<Markdown>{content}</Markdown>);
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = stringFromMarkdown;
  return parser.parse(tempContainer);
};

const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    image(state: any, node: any) {
      state.write(`![${node.attrs.alt || ''}](${node.attrs.src}${node.attrs.title ? ` "${node.attrs.title}"` : ''})`);
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    diffMark: { open: '', close: '' },
    // These marks are not supported by the Markdown renderer, so we strip them
    fontFamily: { open: '', close: '' },
    fontSize: { open: '', close: '' },
    underline: { open: '', close: '' },
    strike: { open: '', close: '' },
    textColor: { open: '', close: '' },
  },
);

export const buildContentFromDocument = (doc: Node) =>
  markdownSerializer.serialize(doc);

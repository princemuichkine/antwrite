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
    table(state: any, node: any) {
      state.write('\n');

      // Try to create a proper markdown table
      const rows: string[][] = [];
      let maxCols = 0;

      node.forEach((row: any) => {
        if (row.type.name === 'table_row') {
          const cells: string[] = [];
          row.forEach((cell: any) => {
            if (cell.type.name === 'table_cell' || cell.type.name === 'table_header') {
              const cellText = cell.textContent.trim().replace(/\n+/g, ' ');
              cells.push(cellText || ' ');
            }
          });
          if (cells.length > 0) {
            rows.push(cells);
            maxCols = Math.max(maxCols, cells.length);
          }
        }
      });

      if (rows.length > 0) {
        // Write the table rows
        rows.forEach((row, index) => {
          // Pad cells to match maxCols
          while (row.length < maxCols) {
            row.push(' ');
          }
          state.write('| ' + row.join(' | ') + ' |\n');

          // Add separator after header row (first row)
          if (index === 0) {
            state.write('|' + ' --- |'.repeat(maxCols) + '\n');
          }
        });
        state.write('\n');
      }

      state.closeBlock(node);
    },
    table_row() {
      // Handled by table serializer
    },
    table_cell(state: any, node: any) {
      // Handled by table serializer
      state.renderContent(node);
    },
    table_header(state: any, node: any) {
      // Handled by table serializer
      state.renderContent(node);
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
    textAlign: { open: '', close: '' },
    lineHeight: { open: '', close: '' },
  },
);

export const buildContentFromDocument = (doc: Node) =>
  markdownSerializer.serialize(doc);

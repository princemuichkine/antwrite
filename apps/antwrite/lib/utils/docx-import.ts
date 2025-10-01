import { documentSchema } from '@/lib/editor/config';
import type { Node } from 'prosemirror-model';

// Convert DOCX content to ProseMirror document
export async function convertDocxToProseMirror(arrayBuffer: ArrayBuffer): Promise<Node> {
  try {
    // Use mammoth to convert DOCX to HTML, which preserves more formatting than markdown
    const [{ default: mammoth }] = await Promise.all([
      import('mammoth'),
    ]);

    const result = await mammoth.convertToHtml({ arrayBuffer });
    let htmlContent = result.value;

    // Parse HTML into ProseMirror document
    const proseMirrorDoc = await htmlToProseMirror(htmlContent);
    return proseMirrorDoc;

  } catch (error) {
    console.error('Error converting DOCX to ProseMirror:', error);
    // Fallback to basic document
    const { nodes } = documentSchema;
    return nodes.doc.create(null, [
      nodes.paragraph.create(null, [
        documentSchema.text('Error importing DOCX file. Please try again or contact support.')
      ])
    ]);
  }
}

// Convert HTML to ProseMirror document
async function htmlToProseMirror(htmlContent: string): Promise<Node> {
  const { nodes, marks } = documentSchema;
  const content: Node[] = [];

  try {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Clean up HTML - remove problematic elements
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (!src || src.trim() === '') {
        img.remove();
      }
    });

    // Process each child element
    for (const child of Array.from(tempDiv.children)) {
      const node = await convertHTMLElementToProseMirror(child);
      if (node) {
        content.push(node);
      }
    }

    // If no content was extracted, try processing text nodes
    if (content.length === 0) {
      const textContent = tempDiv.textContent || '';
      if (textContent.trim()) {
        content.push(nodes.paragraph.create(null, [
          documentSchema.text(textContent.trim())
        ]));
      }
    }

  } catch (error) {
    console.warn('Error parsing HTML to ProseMirror:', error);
    // Fallback
    content.push(nodes.paragraph.create(null, [
      documentSchema.text('Error parsing document content.')
    ]));
  }

  return nodes.doc.create(null, content);
}

// Convert HTML element to ProseMirror node
async function convertHTMLElementToProseMirror(element: Element): Promise<Node | null> {
  const { nodes, marks } = documentSchema;

  const tagName = element.tagName.toLowerCase();
  const textContent = element.textContent || '';

  switch (tagName) {
    case 'p':
      return convertParagraphElement(element);

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      const level = parseInt(tagName.charAt(1));
      return nodes.heading.create({ level: Math.min(level, 2) }, [
        documentSchema.text(textContent)
      ]);

    case 'table':
      return convertTableElement(element);

    case 'ul':
    case 'ol':
      // For now, convert lists to paragraphs (can be enhanced later)
      return nodes.paragraph.create(null, [
        documentSchema.text(textContent)
      ]);

    case 'br':
      return nodes.paragraph.create();

    default:
      // For other elements, extract text content
      if (textContent.trim()) {
        return nodes.paragraph.create(null, [
          documentSchema.text(textContent.trim())
        ]);
      }
      return null;
  }
}

// Convert paragraph element to ProseMirror paragraph
function convertParagraphElement(element: Element): Node {
  const { nodes, marks } = documentSchema;
  const textNodes: Node[] = [];

  // Simple text extraction for now - can be enhanced to handle formatting
  const textContent = element.textContent || '';
  if (textContent.trim()) {
    textNodes.push(documentSchema.text(textContent.trim()));
  }

  return nodes.paragraph.create(null, textNodes);
}

// Convert table element to ProseMirror table
function convertTableElement(element: Element): Node | null {
  const { nodes } = documentSchema;
  const rows: Node[] = [];

  const tableRows = element.querySelectorAll('tr');
  for (const row of Array.from(tableRows)) {
    const cells: Node[] = [];

    const tableCells = row.querySelectorAll('td, th');
    for (const cell of Array.from(tableCells)) {
      const cellContent: Node[] = [];
      const cellText = cell.textContent || '';

      if (cellText.trim()) {
        cellContent.push(nodes.paragraph.create(null, [
          documentSchema.text(cellText.trim())
        ]));
      } else {
        cellContent.push(nodes.paragraph.create());
      }

      const cellNode = nodes.table_cell.create(null, cellContent);
      cells.push(cellNode);
    }

    if (cells.length > 0) {
      const rowNode = nodes.table_row.create(null, cells);
      rows.push(rowNode);
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return nodes.table.create(null, rows);
}


// Legacy function for backward compatibility
export async function convertDocxToMarkdown(arrayBuffer: ArrayBuffer): Promise<string> {
  // This will be replaced with proper ProseMirror conversion
  return 'DOCX import is being upgraded to preserve formatting...';
}

// Helper function to extract text content from DOCX for basic import
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Use mammoth to extract text content from DOCX
    const [{ default: mammoth }] = await Promise.all([
      import('mammoth'),
    ]);

    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

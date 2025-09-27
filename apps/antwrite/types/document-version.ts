/**
 * Document version data structure returned by version APIs
 * This represents both historical versions and the current document state
 * Combined from DocumentVersion table records + current Document title
 */
export type DocumentVersionData = {
  id: string;
  content: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  diffContent?: string | null;
};

/**
 * Type guard to check if an object is a valid DocumentVersionData
 */
export function isDocumentVersionData(obj: any): obj is DocumentVersionData {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    (obj.content === null || typeof obj.content === 'string') &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.version === 'number'
  );
}

/**
 * Convert a Document to DocumentVersionData format
 * Used for backward compatibility
 */
export function documentToVersionData(doc: any, version: number = 1): DocumentVersionData {
  return {
    id: doc.id,
    content: doc.content,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    version,
    diffContent: undefined,
  };
}

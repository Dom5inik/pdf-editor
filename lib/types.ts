export type EditorTool =
  | 'select'
  | 'text'
  | 'symbol'
  | 'image';

export type SymbolType = 'line' | 'circle' | 'square' | 'diamond' | 'arrow-left' | 'arrow-right';

export interface Point {
  x: number;
  y: number;
}

export interface TextElement {
  id: string;
  text: string;
  x: number; // Percentage (0-100) or pixels? Using percentage for better responsiveness.
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through';
}

export interface ImageElement {
  id: string;
  imageData: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SymbolElement {
  id: string;
  type: SymbolType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill?: boolean;
  rotation: number; // Degrees
  isFlippedV?: boolean; // For diagonal lines: true if / direction, false if \ direction
}

export interface EditorElement {
  id: string;
  type: 'text' | 'image' | 'icon' | 'symbol';
  content: TextElement | ImageElement | SymbolElement;
}

export interface PDFPage {
  id: string;
  sourceId: string; // ID to link to the source PDF buffer
  pageNumber: number;
  thumbnail?: string;
  width: number;
  height: number;
  rotation: number;
  elements: EditorElement[];
}

export interface EditorState {
  pdfDocuments: Record<string, ArrayBuffer | File>; // Map of sourceId -> buffer or File
  pages: PDFPage[];
  currentPageIndex: number;
  selectedTool: EditorTool;
  isLoading: boolean;
  isAppending: boolean;
  fileName: string;
  originalFile: File | null;
}

import type { EditorTool } from './types';

export const EDITOR_TOOLS: { id: EditorTool; label: string; icon: string }[] = [
    { id: 'select', label: 'Auswählen', icon: 'MousePointer' },
    { id: 'text', label: 'Text einfügen', icon: 'Type' },
    { id: 'symbol', label: 'Symbol einfügen', icon: 'Shapes' },
    { id: 'image', label: 'Bild einfügen', icon: 'Image' },
];

export const ACCEPTED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const GERMAN_TEXTS = {
    hero: {
        title: 'PDF-Datei hierher ziehen',
        subtitle: 'oder klicken Sie, um eine Datei auszuwählen',
        dropHint: 'Datei hier ablegen',
    },
    editor: {
        download: 'Herunterladen',
        newDocument: 'Neues Dokument',
        addPage: 'Seite hinzufügen',
        deletePage: 'Seite löschen',
        movePage: 'Seite verschieben',
    },
    errors: {
        fileTooBig: 'Die Datei ist zu groß. Maximal 10 MB erlaubt.',
        invalidFile: 'Ungültige Datei. Bitte laden Sie eine PDF-Datei hoch.',
        uploadFailed: 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.',
    },
};

'use client';

import { useCallback, DragEvent } from 'react';
import { Upload, FileText } from 'lucide-react';
import { GERMAN_TEXTS, MAX_FILE_SIZE } from '@/lib/constants';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            if (file.size <= MAX_FILE_SIZE) {
                onFileSelect(file);
            } else {
                alert(GERMAN_TEXTS.errors.fileTooBig);
            }
        } else {
            alert(GERMAN_TEXTS.errors.invalidFile);
        }
    }, [onFileSelect]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size <= MAX_FILE_SIZE) {
                onFileSelect(file);
            } else {
                alert(GERMAN_TEXTS.errors.fileTooBig);
            }
        }
    }, [onFileSelect]);

    return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-app-background relative">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <FileText className="w-24 h-24 text-accent" strokeWidth={1.5} />
                            <div className="absolute -bottom-1 -right-1 bg-accent text-white text-[12px] font-bold px-2 py-0.5 rounded flex items-center justify-center shadow-sm">
                                PDF
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-semibold text-app-foreground mb-3">
                        {GERMAN_TEXTS.hero.title}
                    </h1>
                    <p className="text-lg text-app-muted">
                        {GERMAN_TEXTS.hero.subtitle}
                    </p>
                </div>

                <label
                    htmlFor="pdf-upload"
                    className="relative block"
                >
                    <input
                        type="file"
                        id="pdf-upload"
                        accept=".pdf,application/pdf"
                        onChange={handleChange}
                        className="sr-only"
                    />
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="group relative flex flex-col items-center justify-center min-h-[320px] p-12 border-2 border-dashed border-app-border rounded-2xl bg-app-background cursor-pointer transition-all duration-200 hover:border-accent hover:bg-accent-light/10 focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 shadow-sm"
                    >
                        <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-app-border group-hover:bg-accent-light/20 transition-colors duration-200">
                            <Upload className="w-10 h-10 text-app-muted group-hover:text-accent transition-colors duration-200" />
                        </div>

                        <p className="text-xl font-medium text-app-foreground mb-2">
                            Datei hier ablegen
                        </p>
                        <p className="text-sm text-app-muted">
                            oder klicken Sie zum Auswählen
                        </p>
                        <p className="mt-4 text-xs text-app-muted">
                            PDF-Dateien bis 10 MB
                        </p>
                    </div>
                </label>
            </div>
        </div>
    );
}

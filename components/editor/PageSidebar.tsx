'use client';

import { PageThumbnail } from './PageThumbnail';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { PDFPage } from '@/lib/types';
import { useState, useRef } from 'react';

interface PageSidebarProps {
    pages: PDFPage[];
    currentPageIndex: number;
    isAppending: boolean;
    onPageSelect: (index: number) => void;
    onPageDelete: (pageId: string) => void;
    onPageRotate: (pageId: string) => void;
    onPageMove: (fromIndex: number, toIndex: number) => void;
    onPageAppend: (file: File) => void;
}

export function PageSidebar({
    pages,
    currentPageIndex,
    isAppending,
    onPageSelect,
    onPageDelete,
    onPageRotate,
    onPageMove,
    onPageAppend,
}: PageSidebarProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragStart = (index: number) => (e: React.DragEvent) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleDragOver = (index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            onPageMove(draggedIndex, dropIndex);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onPageAppend(file);
            // Reset input so the same file can be added again if needed
            e.target.value = '';
        }
    };

    return (
        <aside className="w-28 bg-app-background border-r border-app-border flex flex-col h-screen">
            {/* Header */}
            <div className="p-2 border-b border-app-border">
                <h2 className="text-sm font-semibold text-app-foreground">
                    Seiten
                </h2>
            </div>

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 pb-20">
                {pages.map((page, index) => (
                    <PageThumbnail
                        key={page.id}
                        page={page}
                        displayPageNumber={index + 1}
                        isActive={index === currentPageIndex}
                        onSelect={() => onPageSelect(index)}
                        onDelete={() => onPageDelete(page.id)}
                        onRotate={() => onPageRotate(page.id)}
                        onDragStart={handleDragStart(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver(index)}
                        onDrop={handleDrop(index)}
                    />
                ))}

                {/* Add PDF Button */}
                <div className="flex justify-center pt-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => !isAppending && fileInputRef.current?.click()}
                        disabled={isAppending}
                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-dark transition-colors shadow-lg disabled:bg-accent/50 disabled:cursor-not-allowed"
                        title="PDF hinzufügen"
                    >
                        {isAppending ? (
                            <div className="flex gap-1">
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}

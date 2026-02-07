'use client';

import { IconButton } from '@/components/ui/IconButton';
import { Trash2, GripVertical, RotateCw } from 'lucide-react';
import type { PDFPage } from '@/lib/types';
import { useState } from 'react';

interface PageThumbnailProps {
    page: PDFPage;
    displayPageNumber: number;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRotate: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

export function PageThumbnail({
    page,
    displayPageNumber,
    isActive,
    onSelect,
    onDelete,
    onRotate,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: PageThumbnailProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        onDragStart(e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);
        onDragEnd(e);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(e);
    };

    return (
        <div
            className={`relative group cursor-pointer rounded-lg border-2 transition-all p-0.5 ${isActive
                ? 'border-accent bg-accent/5'
                : 'border-transparent hover:border-app-border'
                } ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-accent border-2 bg-accent-light/20' : ''
                }`}
            onClick={onSelect}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="aspect-[3/4] bg-app-background border border-app-border rounded shadow-sm overflow-hidden flex items-center justify-center relative">
                {page.thumbnail ? (
                    <img
                        src={page.thumbnail}
                        alt={`Seite ${displayPageNumber}`}
                        className="w-full h-full object-contain transition-transform duration-200"
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                        draggable={false}
                    />
                ) : (
                    <div className="text-app-muted text-xs text-center p-2">Lade...</div>
                )}

                {/* Overlay Controls - Relocated to top-right */}
                <div
                    className="absolute inset-x-0 top-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-0.5 z-10"
                >
                    <IconButton
                        icon={<RotateCw className="w-3 h-3" />}
                        label="Seite drehen"
                        variant="default"
                        className="!w-5 !h-5 bg-app-background/90 hover:bg-app-background shadow-sm border border-app-border backdrop-blur-sm !p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRotate();
                        }}
                    />
                    <IconButton
                        icon={<Trash2 className="w-3 h-3" />}
                        label="Seite löschen"
                        variant="default"
                        className="!w-5 !h-5 shadow-sm text-red-500 bg-app-background/90 hover:bg-app-background border border-app-border backdrop-blur-sm !p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    />
                </div>

                {/* Visual hover indicator */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-center text-app-muted">
                Seite {displayPageNumber}
            </div>

            {/* Drag Handle */}
            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-5 h-5 flex items-center justify-center text-app-muted cursor-move">
                    <GripVertical className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
}

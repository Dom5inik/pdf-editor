'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, GripHorizontal, Maximize2 } from 'lucide-react';
import type { ImageElement } from '@/lib/types';

interface ImageAnnotationProps {
    element: ImageElement;
    onUpdate: (updates: Partial<ImageElement>) => void;
    onRemove: () => void;
    scale: number;
    pageWidth: number;
    pageHeight: number;
}

export function ImageAnnotation({
    element,
    onUpdate,
    onRemove,
    scale,
    pageWidth,
    pageHeight
}: ImageAnnotationProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [resizingCorner, setResizingCorner] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
    const [resizeStart, setResizeStart] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        elementX: 0,
        elementY: 0,
        anchorX: 0,
        anchorY: 0,
        aspectRatio: 1
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Handle Dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const parent = containerRef.current?.offsetParent;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            const deltaX = ((e.clientX - dragStart.x) / parentRect.width) * 100;
            const deltaY = ((e.clientY - dragStart.y) / parentRect.height) * 100;

            onUpdate({
                x: Math.max(0, Math.min(100 - element.width, dragStart.elementX + deltaX)),
                y: Math.max(0, Math.min(100 - element.height, dragStart.elementY + deltaY))
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, onUpdate, element.width, element.height]);

    // Handle Resizing
    useEffect(() => {
        if (!resizingCorner) return;

        const handleMouseMove = (e: MouseEvent) => {
            const parent = containerRef.current?.offsetParent;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            // Current mouse position in percentage
            const mouseX = ((e.clientX - parentRect.left) / parentRect.width) * 100;
            const mouseY = ((e.clientY - parentRect.top) / parentRect.height) * 100;

            const anchorX = resizeStart.anchorX;
            const anchorY = resizeStart.anchorY;

            let newWidth = Math.abs(mouseX - anchorX);
            let newHeight = Math.abs(mouseY - anchorY);

            // Proportional scaling when Shift is held
            if (e.shiftKey) {
                // Convert to visual pixels to calculate proportional size correctly
                const visualW = newWidth * (pageWidth / 100);
                const visualH = newHeight * (pageHeight / 100);

                // Use the larger dimension to drive the resize for a better feel
                if (visualW / resizeStart.aspectRatio > visualH) {
                    newHeight = (visualW / resizeStart.aspectRatio / pageHeight) * 100;
                } else {
                    newWidth = (visualH * resizeStart.aspectRatio / pageWidth) * 100;
                }
            }

            // Calculate new X and Y based on which corner is being dragged
            const x = Math.min(anchorX, anchorX + (mouseX < anchorX ? -newWidth : newWidth));
            const y = Math.min(anchorY, anchorY + (mouseY < anchorY ? -newHeight : newHeight));

            onUpdate({
                x: Math.max(0, Math.min(100 - newWidth, x)),
                y: Math.max(0, Math.min(100 - newHeight, y)),
                width: Math.max(1, newWidth),
                height: Math.max(1, newHeight)
            });
        };

        const handleMouseUp = () => setResizingCorner(null);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCorner, resizeStart, onUpdate, pageWidth, pageHeight]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.handle')) return;

        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            elementX: element.x,
            elementY: element.y
        });
        e.stopPropagation();
    };

    const handleResizeDown = (e: React.MouseEvent, corner: string) => {
        e.stopPropagation();
        e.preventDefault();

        // Calculate anchor point (opposite corner)
        let anchorX = element.x;
        let anchorY = element.y;

        if (corner === 'top-left') {
            anchorX = element.x + element.width;
            anchorY = element.y + element.height;
        } else if (corner === 'top-right') {
            anchorX = element.x;
            anchorY = element.y + element.height;
        } else if (corner === 'bottom-left') {
            anchorX = element.x + element.width;
            anchorY = element.y;
        } else if (corner === 'bottom-right') {
            anchorX = element.x;
            anchorY = element.y;
        }

        setResizingCorner(corner);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: element.width,
            height: element.height,
            elementX: element.x,
            elementY: element.y,
            anchorX,
            anchorY,
            aspectRatio: (element.width * pageWidth) / (element.height * pageHeight)
        });
    };

    return (
        <div
            ref={containerRef}
            className={`absolute group select-none pointer-events-auto ${isDragging || resizingCorner ? 'z-50' : 'z-20'}`}
            style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Action Buttons */}
            <div
                className={`absolute -top-12 left-0 bg-app-background border border-app-border shadow-xl rounded-lg p-1 items-center gap-0.5 z-[60] animate-in fade-in zoom-in-95 duration-200
                    ${(isDragging || resizingCorner) ? 'hidden' : 'hidden group-hover:flex'}
                `}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-error/10 text-error/70 hover:text-error transition-colors"
                    title="Bild löschen"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="w-full h-full relative border border-transparent group-hover:border-accent/50 transition-colors">
                <img
                    ref={imgRef}
                    src={element.imageData}
                    alt="Uploaded annotation"
                    className="w-full h-full object-fill pointer-events-none"
                />

                {/* Resize Handles */}
                <div
                    className="handle absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onMouseDown={(e) => handleResizeDown(e, 'top-left')}
                />
                <div
                    className="handle absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onMouseDown={(e) => handleResizeDown(e, 'top-right')}
                />
                <div
                    className="handle absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onMouseDown={(e) => handleResizeDown(e, 'bottom-left')}
                />
                <div
                    className="handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onMouseDown={(e) => handleResizeDown(e, 'bottom-right')}
                />
            </div>
        </div>
    );
}

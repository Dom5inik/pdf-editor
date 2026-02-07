'use client';

import { useState, useEffect, useRef } from 'react';
import { Type, X, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import type { TextElement } from '@/lib/types';

interface TextAnnotationProps {
    element: TextElement;
    onUpdate: (updates: Partial<TextElement>) => void;
    onRemove: () => void;
    onBlur: () => void;
    autoFocus?: boolean;
    scale: number;
}

const FONTS = [
    { name: 'Helvetica (Sans)', value: 'Helvetica, Arial, sans-serif' },
    { name: 'Times (Serif)', value: '"Times New Roman", Times, serif' },
    { name: 'Courier (Mono)', value: '"Courier New", Courier, monospace' },
];

const COLORS = [
    '#000000', '#FF0000', '#0000FF', '#008000', '#FF8C00', '#800080', '#555555'
];

export function TextAnnotation({
    element,
    onUpdate,
    onRemove,
    onBlur,
    autoFocus = false,
    scale
}: TextAnnotationProps) {
    const [isEditing, setIsEditing] = useState(autoFocus);
    const [showToolbar, setShowToolbar] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate visual font size based on current zooom level relative to base scale (1.5)
    // We use a minimum scale factor of 0.1 to prevent division by zero or extremely small text
    const visualFontSize = element.fontSize * (scale / 1.5);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    // Handle click outside to close editor
    useEffect(() => {
        if (!isEditing) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsEditing(false);
                setShowToolbar(false);
                if (!element.text.trim()) onRemove();
                onBlur();
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, element.text, onRemove, onBlur]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const parent = containerRef.current?.offsetParent;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            const deltaX = ((e.clientX - dragStart.x) / parentRect.width) * 100;
            const deltaY = ((e.clientY - dragStart.y) / parentRect.height) * 100;

            onUpdate({
                x: Math.max(0, Math.min(100, dragStart.elementX + deltaX)),
                y: Math.max(0, Math.min(100, dragStart.elementY + deltaY))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, onUpdate]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Don't start drag if clicking toolbar buttons or inputs
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('select') || target.closest('input')) return;

        // If editing, allow dragging ONLY if clicking on the container border/padding (not the textarea itself)
        if (isEditing && target.tagName === 'TEXTAREA') return;

        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            elementX: element.x,
            elementY: element.y
        });
        e.preventDefault();
        e.stopPropagation();
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ text: e.target.value });
    };

    const toggleStyle = (style: 'fontWeight' | 'fontStyle' | 'textDecoration', value: string) => {
        if (style === 'textDecoration') {
            const current = element.textDecoration;
            let next: TextElement['textDecoration'] = 'none';

            if (value === 'underline') {
                if (current === 'underline') next = 'none';
                else if (current === 'line-through') next = 'underline line-through';
                else if (current === 'underline line-through') next = 'line-through';
                else next = 'underline';
            } else if (value === 'line-through') {
                if (current === 'line-through') next = 'none';
                else if (current === 'underline') next = 'underline line-through';
                else if (current === 'underline line-through') next = 'underline';
                else next = 'line-through';
            }
            onUpdate({ textDecoration: next });
        } else {
            const current = element[style];
            onUpdate({ [style]: current === value ? 'normal' : value });
        }
    };

    return (
        <div
            ref={containerRef}
            className={`absolute cursor-move group select-none ${isDragging ? 'z-50' : ''} p-2 border-2 border-transparent hover:border-accent/30 rounded transition-colors`}
            style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                // Negative translate compensates for padding (12px) and borders (4px) 
                // ensuring the text content stays anchored to the (x,y) coordinate during zoom.
                transform: 'translate(-16px, -16px)',
                zIndex: isEditing || isDragging ? 50 : 20
            }}
            onMouseDown={handleMouseDown}
        // Removed hover listeners as requested (toolbar only on edit)
        >
            {/* Toolbar - Only visible during editing */}
            {isEditing && (
                <div className={`absolute left-1/2 -translate-x-1/2 bg-app-background border border-app-border shadow-xl rounded-lg p-1.5 flex items-center gap-1 min-w-max animate-in fade-in zoom-in duration-200 pointer-events-auto ${element.y < 20 ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                    <select
                        className="text-xs bg-transparent border-none focus:ring-0 p-1 cursor-pointer text-app-foreground"
                        value={element.fontFamily}
                        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    >
                        {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>

                    <div className="w-px h-4 bg-app-border mx-1" />

                    <input
                        type="number"
                        className="w-10 text-xs bg-transparent border-none focus:ring-0 p-1 text-app-foreground"
                        value={element.fontSize}
                        min={8}
                        max={72}
                        onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
                    />

                    <div className="w-px h-4 bg-app-border mx-1" />

                    <button
                        onClick={(e) => { e.stopPropagation(); toggleStyle('fontWeight', 'bold'); }}
                        className={`p-1 rounded hover:bg-app-border transition-colors ${element.fontWeight === 'bold' ? 'bg-accent/20 text-accent' : 'text-app-muted'}`}
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleStyle('fontStyle', 'italic'); }}
                        className={`p-1 rounded hover:bg-app-border transition-colors ${element.fontStyle === 'italic' ? 'bg-accent/20 text-accent' : 'text-app-muted'}`}
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleStyle('textDecoration', 'underline'); }}
                        className={`p-1 rounded hover:bg-app-border transition-colors ${element.textDecoration.includes('underline') ? 'bg-accent/20 text-accent' : 'text-app-muted'}`}
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleStyle('textDecoration', 'line-through'); }}
                        className={`p-1 rounded hover:bg-app-border transition-colors ${element.textDecoration.includes('line-through') ? 'bg-accent/20 text-accent' : 'text-app-muted'}`}
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-app-border mx-1" />

                    <div className="relative w-5 h-5 rounded-full overflow-hidden border border-app-border cursor-pointer hover:scale-110 transition-transform" title="Wybierz kolor">
                        <input
                            type="color"
                            value={element.color}
                            onChange={(e) => onUpdate({ color: e.target.value })}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer opacity-0"
                        />
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: element.color }} />
                    </div>

                    <div className="w-px h-4 bg-app-border mx-1" />

                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1 rounded hover:bg-error/10 text-error transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Content Container - Grid for auto-sizing */}
            <div className="grid grid-cols-1 grid-rows-1">
                {/* Ghost Element (View Mode & Sizing) */}
                <div
                    className={`col-start-1 row-start-1 p-1 m-0 block leading-[1.2] rounded whitespace-pre-wrap border-2 border-transparent min-h-[1.5em] min-w-[1ch] break-all ${isEditing ? 'invisible pointer-events-none' : 'pointer-events-auto cursor-text'}`}
                    onClick={(e) => {
                        // Only enter edit mode if not dragging and not already editing
                        if (!isEditing && !isDragging) {
                            e.stopPropagation();
                            setIsEditing(true);
                        }
                    }}
                    // Allow dragging by clicking directly on text
                    onMouseDown={(e) => {
                        // Don't stop propagation, let it bubble to container for drag
                    }}
                    style={{
                        color: element.color,
                        fontSize: `${visualFontSize}px`,
                        fontFamily: element.fontFamily,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle,
                        textDecoration: element.textDecoration,
                    }}
                >
                    {element.text || "Text eingeben"}{element.text.endsWith('\n') ? '\n ' : ''}
                </div>

                {/* Textarea (Edit Mode) */}
                {isEditing && (
                    <textarea
                        ref={textareaRef}
                        value={element.text}
                        onChange={handleTextChange}
                        onBlur={(e) => {
                            if (isDragging) return;
                            // Don't close if clicking toolbar or other elements within the container
                            if (containerRef.current?.contains(e.relatedTarget as Node)) return;

                            setIsEditing(false);
                            if (!element.text.trim()) onRemove();
                            onBlur();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                textareaRef.current?.blur();
                            }
                            e.stopPropagation();
                        }}
                        className="col-start-1 row-start-1 w-full h-full p-1 m-0 block leading-[1.2] rounded bg-transparent border-2 border-accent/50 focus:ring-0 focus:outline-none resize-none overflow-hidden min-h-[1.5em] min-w-[1ch] pointer-events-auto break-all"
                        style={{
                            color: element.color,
                            fontSize: `${visualFontSize}px`,
                            fontFamily: element.fontFamily,
                            fontWeight: element.fontWeight,
                            fontStyle: element.fontStyle,
                            textDecoration: element.textDecoration,
                        }}
                    />
                )}
            </div>
        </div>
    );
}

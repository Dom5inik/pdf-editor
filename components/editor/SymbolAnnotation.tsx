'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, GripHorizontal, RotateCcw, Square } from 'lucide-react';
import type { SymbolElement, SymbolType } from '@/lib/types';

interface SymbolAnnotationProps {
    element: SymbolElement;
    onUpdate: (updates: Partial<SymbolElement>) => void;
    onRemove: () => void;
    scale: number;
    isBeingCreated?: boolean;
    pageWidth: number;
    pageHeight: number;
}

export function SymbolAnnotation({
    element,
    onUpdate,
    onRemove,
    scale,
    isBeingCreated = false,
    pageWidth,
    pageHeight
}: SymbolAnnotationProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizingStart, setIsResizingStart] = useState(false);
    const [isResizingEnd, setIsResizingEnd] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elementX: 0, elementY: 0, otherDotX: 0, otherDotY: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Axis snapping utility (now hybrid: 5 degrees OR fixed 1.5% distance)
    const getSnappedDimensions = (p1x: number, p1y: number, p2x: number, p2y: number, isShift: boolean) => {
        const dx = p1x - p2x;
        const dy = p1y - p2y;
        const angleDeg = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        const DEG_THRESHOLD = 2.5;
        const DIST_THRESHOLD = 1.2;

        let x1 = p1x;
        let y1 = p1y;

        const isHorizontalSnap = Math.abs(dy) < DIST_THRESHOLD || angleDeg < DEG_THRESHOLD || angleDeg > (180 - DEG_THRESHOLD);
        const isVerticalSnap = Math.abs(dx) < DIST_THRESHOLD || Math.abs(angleDeg - 90) < DEG_THRESHOLD;

        if (isShift) {
            if (Math.abs(dx) > Math.abs(dy)) y1 = p2y;
            else x1 = p2x;
        } else if (isHorizontalSnap) {
            y1 = p2y;
        } else if (isVerticalSnap) {
            x1 = p2x;
        }
        return { x1, y1 };
    };

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
    }, [isDragging, dragStart, onUpdate]);

    // Handle Resizing (Any Dot)
    useEffect(() => {
        if (!isResizingStart && !isResizingEnd) return;

        const handleMouseMove = (e: MouseEvent) => {
            const parent = containerRef.current?.offsetParent;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            let p1x = Math.max(0, Math.min(100, ((e.clientX - parentRect.left) / parentRect.width) * 100));
            let p1y = Math.max(0, Math.min(100, ((e.clientY - parentRect.top) / parentRect.height) * 100));
            const p2x = resizeStart.otherDotX;
            const p2y = resizeStart.otherDotY;

            if (element.type === 'line') {
                const snapped = getSnappedDimensions(p1x, p1y, p2x, p2y, e.shiftKey);
                p1x = snapped.x1;
                p1y = snapped.y1;

                onUpdate({
                    x: Math.min(p1x, p2x),
                    y: Math.min(p1y, p2y),
                    width: Math.abs(p1x - p2x),
                    height: Math.abs(p1y - p2y),
                    // Check if one point is 'flipped' relative to the other to determine line direction
                    isFlippedV: (p1y - p2y) * (p1x - p2x) < 0
                });
            } else {
                // Standard bounding box resize (4 corners, rotation-aware).
                // We must handle resizing while the shape is rotated!
                const rad = (element.rotation * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                // 1. Calculate the vector from anchor (p2) to current mouse (p1)
                const vx = p1x - p2x;
                const vy = p1y - p2y;

                // 2. Rotate this vector into the shape's LOCAL coordinate space.
                // This lets us calculate 'width' and 'height' along the shape's own axes.
                let dxL = vx * cos + vy * sin;
                let dyL = -vx * sin + vy * cos;

                let width = Math.abs(dxL);
                let height = Math.abs(dyL);

                if (e.shiftKey && (element.type === 'square' || element.type === 'circle')) {
                    const visualW = width * (pageWidth / 100);
                    const visualH = height * (pageHeight / 100);
                    const visualSize = Math.max(visualW, visualH);

                    const newWidth = (visualSize / pageWidth) * 100;
                    const newHeight = (visualSize / pageHeight) * 100;

                    width = newWidth;
                    height = newHeight;
                }

                // 3. Calculate new center. We move from the anchor point (p2)
                // by half the new dimensions in the rotated direction.
                const localCx = (dxL < 0 ? -1 : 1) * (width / 2);
                const localCy = (dyL < 0 ? -1 : 1) * (height / 2);

                // 4. Transform local center back to page space coordinates.
                const cx = p2x + localCx * cos - localCy * sin;
                const cy = p2y + localCx * sin + localCy * cos;

                onUpdate({
                    x: cx - width / 2,
                    y: cy - height / 2,
                    width: Math.max(0.1, width),
                    height: Math.max(0.1, height)
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizingStart(false);
            setIsResizingEnd(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingStart, isResizingEnd, resizeStart, onUpdate, element.type]);

    // Handle Rotation
    useEffect(() => {
        if (!isRotating) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const angle = Math.atan2(dy, dx);
            // Convert radians to degrees and offset by 90 because handle is at the bottom (or top)
            let degrees = (angle * 180) / Math.PI - 90;

            // Snap rotation to every 15 degrees for cleaner results
            const snap = 15;
            degrees = Math.round(degrees / snap) * snap;

            onUpdate({ rotation: degrees });
        };

        const handleMouseUp = () => setIsRotating(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isRotating, onUpdate]);

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

    const handleResizeStartDown = (e: React.MouseEvent) => {
        const isFlippedV = element.isFlippedV || false;
        // If Dot 1 is at (x, y) [!fV] or (x, y+h) [fV]
        // Other dot (Dot 2) is at (x+w, y+h) [!fV] or (x+w, y) [fV]
        setIsResizingStart(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: element.width,
            height: element.height,
            elementX: element.x,
            elementY: element.y,
            otherDotX: element.x + element.width,
            otherDotY: isFlippedV ? element.y : element.y + element.height
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleResizeEndDown = (e: React.MouseEvent) => {
        const isFlippedV = element.isFlippedV || false;
        // Dot 1 is at (x, y) [!fV] or (x, y+h) [fV]
        setIsResizingEnd(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: element.width,
            height: element.height,
            elementX: element.x,
            elementY: element.y,
            otherDotX: element.x,
            otherDotY: isFlippedV ? element.y + element.height : element.y
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleRotateDown = (e: React.MouseEvent) => {
        setIsRotating(true);
        e.stopPropagation();
        e.preventDefault();
    };

    const renderShape = () => {
        const stroke = element.color;
        const strokeWidth = element.strokeWidth;
        const fill = element.fill ? element.color : 'none';
        const vectorEffect = "non-scaling-stroke";

        switch (element.type) {
            case 'line':
                // Perfect Horizontal or Vertical Snapping Cases
                if (element.height === 0) {
                    return (
                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect={vectorEffect} />
                    );
                }
                if (element.width === 0) {
                    return (
                        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect={vectorEffect} />
                    );
                }

                // Normal Diagonal Case
                const y1 = element.isFlippedV ? "100%" : "0";
                const y2 = element.isFlippedV ? "0" : "100%";
                return (
                    <line x1="0" y1={y1} x2="100%" y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect={vectorEffect} />
                );
            case 'circle':
                return (
                    <ellipse cx="50%" cy="50%" rx="45%" ry="45%" stroke={stroke} strokeWidth={strokeWidth} fill={fill} vectorEffect={vectorEffect} />
                );
            case 'square':
                return (
                    <rect x="5%" y="5%" width="90%" height="90%" stroke={stroke} strokeWidth={strokeWidth} fill={fill} vectorEffect={vectorEffect} />
                );
            case 'diamond':
                return (
                    <polygon
                        points="50,5 95,50 50,95 5,50"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        fill={fill}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect={vectorEffect}
                    />
                );
            case 'arrow-right':
                return (
                    <g stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" strokeLinejoin="round" vectorEffect={vectorEffect}>
                        <line x1="5%" y1="50%" x2="90%" y2="50%" vectorEffect={vectorEffect} />
                        <line x1="90%" y1="50%" x2="60%" y2="20%" vectorEffect={vectorEffect} />
                        <line x1="90%" y1="50%" x2="60%" y2="80%" vectorEffect={vectorEffect} />
                    </g>
                );
            case 'arrow-left':
                return (
                    <g stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" strokeLinejoin="round" vectorEffect={vectorEffect}>
                        <line x1="95%" y1="50%" x2="10%" y2="50%" vectorEffect={vectorEffect} />
                        <line x1="10%" y1="50%" x2="40%" y2="20%" vectorEffect={vectorEffect} />
                        <line x1="10%" y1="50%" x2="40%" y2="80%" vectorEffect={vectorEffect} />
                    </g>
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`absolute group select-none pointer-events-auto ${isDragging || isResizingStart || isResizingEnd || isRotating ? 'z-50' : 'z-20'}`}
            style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
                minWidth: element.type === 'line' ? (element.width === 0 ? '1px' : '10px') : '10px',
                minHeight: element.type === 'line' ? (element.height === 0 ? '1px' : '10px') : '10px',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Bridge hit area expansion to prevents buttons from disappearing */}
            <div className="absolute -inset-x-4 -top-14 bottom-0 cursor-default pointer-events-auto opacity-0 z-[-1]" />

            {/* Action Buttons (Fixed, no rotation) */}
            <div
                className={`absolute -top-12 left-0 bg-app-background border border-app-border shadow-xl rounded-lg p-1 items-center gap-0.5 z-[60] animate-in fade-in zoom-in-95 duration-200
                    ${(isDragging || isResizingStart || isResizingEnd || isRotating || isBeingCreated) ? 'hidden' : 'hidden group-hover:flex'}
                `}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ transform: 'none' }}
            >
                {/* ... existing action buttons ... */}
                <div className="mx-1 w-6 h-6 rounded-md border border-app-border overflow-hidden relative cursor-pointer hover:border-accent transition-colors">
                    <input
                        type="color"
                        value={element.color}
                        onChange={(e) => onUpdate({ color: e.target.value })}
                        className="absolute inset-x-[-50%] inset-y-[-50%] w-[200%] h-[200%] cursor-pointer opacity-0"
                    />
                    <div className="absolute inset-1 rounded-sm pointer-events-none" style={{ backgroundColor: element.color }} />
                </div>

                <div className="w-px h-4 bg-app-border mx-1" />

                <div className="flex bg-app-border/30 rounded-md p-0.5">
                    {[1, 2, 4, 8].map((w) => (
                        <button
                            key={w}
                            onClick={(e) => { e.stopPropagation(); onUpdate({ strokeWidth: w }); }}
                            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${element.strokeWidth === w
                                ? 'bg-app-background text-accent shadow-sm'
                                : 'text-app-muted hover:text-app-foreground hover:bg-app-background/50'}`}
                        >
                            <span className="text-[10px] font-bold">{w}</span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-4 bg-app-border mx-1" />

                <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({ fill: !element.fill }); }}
                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-app-border transition-colors ${element.fill ? 'text-accent' : 'text-app-muted'}`}
                    title="Füllung umschalten"
                >
                    <Square className={`w-4 h-4 ${element.fill ? 'fill-current' : ''}`} />
                </button>

                <div className="w-px h-4 bg-app-border mx-1" />

                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-error/10 text-error/70 hover:text-error transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Rotatable Content Area */}
            <div
                className="w-full h-full relative"
                style={{ transform: `rotate(${element.rotation}deg)` }}
            >
                {/* Border (Visual Guide) - Hidden for lines to focus on the segment */}
                {element.type !== 'line' && (
                    <div className={`absolute inset-x-[-2px] inset-y-[-2px] border border-dashed pointer-events-none transition-opacity ${isDragging || isResizingStart || isResizingEnd || isRotating ? 'border-accent opacity-100' : 'border-accent/30 opacity-0 group-hover:opacity-100'}`} />
                )}

                {/* Line Ends (The Two Dots) */}
                {element.type === 'line' && (
                    <>
                        <div
                            className={`handle absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-accent rounded-full cursor-move z-[70] shadow-sm transition-opacity group-hover:opacity-100 ${isResizingStart ? 'opacity-100 scale-125' : 'opacity-0'}`}
                            style={{ left: '0%', top: element.isFlippedV ? '100%' : '0%' }}
                            onMouseDown={handleResizeStartDown}
                        />
                        <div
                            className={`handle absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-accent rounded-full cursor-move z-[70] shadow-sm transition-opacity group-hover:opacity-100 ${isResizingEnd ? 'opacity-100 scale-125' : 'opacity-0'}`}
                            style={{ left: '100%', top: element.isFlippedV ? '0%' : '100%' }}
                            onMouseDown={handleResizeEndDown}
                        />
                    </>
                )}

                {/* Multi-Corner Handles (Squares/Circles) */}
                {element.type !== 'line' && (
                    <>
                        {/* Top-Left */}
                        <div
                            className="handle absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                                setIsResizingStart(true);
                                const rad = (element.rotation * Math.PI) / 180;
                                const centerX = element.x + element.width / 2;
                                const centerY = element.y + element.height / 2;

                                // To resize from Top-Left, the BOTTOM-RIGHT corner must stay fixed (the anchor).
                                // We calculate where that corner is in page space, considering rotation.
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);
                                const anchorX = centerX + (element.width / 2) * cos - (element.height / 2) * sin;
                                const anchorY = centerY + (element.width / 2) * sin + (element.height / 2) * cos;

                                setResizeStart({
                                    x: e.clientX,
                                    y: e.clientY,
                                    width: element.width,
                                    height: element.height,
                                    elementX: element.x,
                                    elementY: element.y,
                                    otherDotX: anchorX,
                                    otherDotY: anchorY
                                });
                                e.stopPropagation();
                            }}
                        />
                        {/* Top-Right */}
                        <div
                            className="handle absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                                setIsResizingEnd(true);
                                const rad = (element.rotation * Math.PI) / 180;
                                const centerX = element.x + element.width / 2;
                                const centerY = element.y + element.height / 2;
                                // Anchor is Bottom-Left (relative offset: -w/2, h/2)
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);
                                const anchorX = centerX + (-element.width / 2) * cos - (element.height / 2) * sin;
                                const anchorY = centerY + (-element.width / 2) * sin + (element.height / 2) * cos;

                                setResizeStart({
                                    x: e.clientX,
                                    y: e.clientY,
                                    width: element.width,
                                    height: element.height,
                                    elementX: element.x,
                                    elementY: element.y,
                                    otherDotX: anchorX,
                                    otherDotY: anchorY
                                });
                                e.stopPropagation();
                            }}
                        />
                        {/* Bottom-Left */}
                        <div
                            className="handle absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                                setIsResizingStart(true);
                                const rad = (element.rotation * Math.PI) / 180;
                                const centerX = element.x + element.width / 2;
                                const centerY = element.y + element.height / 2;
                                // Anchor is Top-Right (relative offset: w/2, -h/2)
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);
                                const anchorX = centerX + (element.width / 2) * cos - (-element.height / 2) * sin;
                                const anchorY = centerY + (element.width / 2) * sin + (-element.height / 2) * cos;

                                setResizeStart({
                                    x: e.clientX,
                                    y: e.clientY,
                                    width: element.width,
                                    height: element.height,
                                    elementX: element.x,
                                    elementY: element.y,
                                    otherDotX: anchorX,
                                    otherDotY: anchorY
                                });
                                e.stopPropagation();
                            }}
                        />
                        {/* Bottom-Right */}
                        <div
                            className="handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-accent rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                                setIsResizingEnd(true);
                                const rad = (element.rotation * Math.PI) / 180;
                                const centerX = element.x + element.width / 2;
                                const centerY = element.y + element.height / 2;
                                // Anchor is Top-Left (relative offset: -w/2, -h/2)
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);
                                const anchorX = centerX + (-element.width / 2) * cos - (-element.height / 2) * sin;
                                const anchorY = centerY + (-element.width / 2) * sin + (-element.height / 2) * cos;

                                setResizeStart({
                                    x: e.clientX,
                                    y: e.clientY,
                                    width: element.width,
                                    height: element.height,
                                    elementX: element.x,
                                    elementY: element.y,
                                    otherDotX: anchorX,
                                    otherDotY: anchorY
                                });
                                e.stopPropagation();
                            }}
                        />
                    </>
                )}

                {/* Shape SVG */}
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                    style={{ overflow: 'visible' }}
                >
                    {renderShape()}
                </svg>
            </div>

            {/* Rotation Handle (Bottom Center) - Outside the rotatable div to stay fixed */}
            {element.type !== 'line' && (
                <div
                    className={`handle absolute -bottom-14 left-1/2 -translate-x-1/2 w-8 h-8 bg-app-background border border-accent rounded-full shadow-lg flex items-center justify-center cursor-alias z-[80] transition-all hover:bg-accent hover:text-white
                        ${(isDragging || isResizingStart || isResizingEnd || isRotating || isBeingCreated) ? 'hidden' : 'opacity-0 group-hover:opacity-100'}
                    `}
                    onMouseDown={handleRotateDown}
                >
                    <RotateCcw className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}

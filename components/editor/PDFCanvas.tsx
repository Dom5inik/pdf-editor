'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFPage, EditorElement, TextElement, SymbolElement, SymbolType, ImageElement } from '@/lib/types';
import { TextAnnotation } from './TextAnnotation';
import { SymbolAnnotation } from './SymbolAnnotation';
import { ImageAnnotation } from './ImageAnnotation';

interface PDFCanvasProps {
    page: PDFPage;
    fileName: string;
    pdfDocument: any;
    selectedTool: string;
    selectedSymbolType: SymbolType;
    strokeWidth: number;
    onAddElement: (pageId: string, element: EditorElement) => void;
    onUpdateElement: (pageId: string, elementId: string, updates: Partial<EditorElement>) => void;
    onRemoveElement: (pageId: string, elementId: string) => void;
}

export function PDFCanvas({
    page,
    fileName,
    pdfDocument,
    selectedTool,
    selectedSymbolType,
    strokeWidth,
    onAddElement,
    onUpdateElement,
    onRemoveElement
}: PDFCanvasProps) {
    const [scale, setScale] = useState(1.5);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const renderTaskRef = useRef<any>(null);
    const [isPlacing, setIsPlacing] = useState<string | null>(null);


    // Panning/Drawing state
    const [isPanning, setIsPanning] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingStart, setDrawingStart] = useState({ x: 0, y: 0 });
    const [currentElementId, setCurrentElementId] = useState<string | null>(null);

    const panStartRef = useRef({ x: 0, y: 0 });
    const scrollStartRef = useRef({ left: 0, top: 0 });
    const scrollerRef = useRef<HTMLDivElement>(null);

    // Handle Ctrl + Scroll for zooming
    useEffect(() => {
        const container = scrollerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                // Ctrl + Scroll: Changes the CSS scale of the page container.
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setScale(Math.min(Math.max(0.2, scale + delta), 5.0));
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const renderPage = async () => {
            const canvas = canvasRef.current;
            if (!canvas || !pdfDocument) return;

            try {
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                    try {
                        await renderTaskRef.current.promise;
                    } catch (e) { }
                }

                if (isCancelled) return;

                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

                const pdfPage = await pdfDocument.getPage(page.pageNumber);
                const finalRotation = (pdfPage.rotate + page.rotation) % 360;

                // Handle High DPI displays to prevent blurry PDF rendering.
                // We render the canvas at a higher resolution (canvasScale) 
                // but keep the CSS dimensions (scale) matching the layout.
                const dpr = window.devicePixelRatio || 1;
                const canvasScale = scale * dpr;

                // Logical viewport for layout dimensions (CSS size)
                const viewport = pdfPage.getViewport({ scale: scale, rotation: finalRotation });
                // Scaled viewport for rendering quality (Canvas size)
                const scaledViewport = pdfPage.getViewport({ scale: canvasScale, rotation: finalRotation });

                const context = canvas.getContext('2d');
                if (!context || isCancelled) return;

                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                    canvas: canvas,
                };

                const renderTask = pdfPage.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;

                if (!isCancelled) {
                    renderTaskRef.current = null;
                    setError(null);
                }
            } catch (err: any) {
                if (isCancelled || err?.name === 'RenderingCancelledException') return;
                console.error('Error rendering PDF page:', err);
                setError('Fehler beim Laden der Seite');
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) renderTaskRef.current.cancel();
        };
    }, [page, pdfDocument, scale]);

    // Handle Image upload trigger
    useEffect(() => {
        if (selectedTool === 'image' && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, [selectedTool]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;

            // Create an image object to get dimensions
            const img = new Image();
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;
                const imgAspectRatio = imgWidth / imgHeight;

                // Default width is 30% of page width
                // For better UX, max 50% width or 50% height
                let width = 30;
                let height = (width * (page.width / 100) / imgAspectRatio) / (page.height / 100);

                if (height > 50) {
                    height = 50;
                    width = (height * (page.height / 100) * imgAspectRatio) / (page.width / 100);
                }

                const newElementId = `image-${Date.now()}`;
                const newImageElement: EditorElement = {
                    id: newElementId,
                    type: 'image',
                    content: {
                        id: newElementId,
                        imageData: dataUrl,
                        x: 50 - width / 2,
                        y: 50 - height / 2,
                        width,
                        height
                    } as any
                };

                onAddElement(page.id, newImageElement);
                // Reset file input so same file can be uploaded again
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        if (selectedTool !== 'text') return; // Symbols handled by drag

        const target = e.target as HTMLElement;
        if (target.closest('.pointer-events-auto') || target.closest('[data-annotation]')) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Convert screen coordinates (clientX/Y) to page percentage (0-100%).
        // This ensures annotations stay properly positioned regardless of zoom.
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newElementId = `text-${Date.now()}`;
        const newTextElement: EditorElement = {
            id: newElementId,
            type: 'text',
            content: {
                id: newElementId,
                text: '',
                x,
                y,
                fontSize: 16,
                color: '#000000',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none'
            } as TextElement
        };

        onAddElement(page.id, newTextElement);
        setIsPlacing(newElementId);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.pointer-events-auto') || target.closest('[data-annotation]')) return;

        if (selectedTool === 'symbol' && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Check if click is outside the page container
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            const newElementId = `symbol-${Date.now()}`;
            setIsDrawing(true);
            setDrawingStart({ x, y });
            setCurrentElementId(newElementId);

            const newSymbolElement: EditorElement = {
                id: newElementId,
                type: 'symbol',
                content: {
                    id: newElementId,
                    type: selectedSymbolType,
                    x,
                    y,
                    width: 0.1,
                    height: 0.1,
                    color: '#000000',
                    strokeWidth: strokeWidth,
                    fill: false,
                    rotation: 0,
                    isFlippedV: false
                } as SymbolElement
            };
            onAddElement(page.id, newSymbolElement);
            e.preventDefault();
        } else if (selectedTool === 'select' && scrollerRef.current) {
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            scrollStartRef.current = {
                left: scrollerRef.current.scrollLeft,
                top: scrollerRef.current.scrollTop
            };
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDrawing && currentElementId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Clamp coordinates to stay within the page boundaries
            let currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            let currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            // Axis snapping logic: makes it easier to draw perfect horizontal or vertical lines.
            const dx_val = currentX - drawingStart.x;
            const dy_val = currentY - drawingStart.y;
            const angleDeg = Math.abs(Math.atan2(dy_val, dx_val) * 180 / Math.PI);

            // Check for Shift key (we need to track it or use the event)
            const isShiftPressed = (e.nativeEvent as MouseEvent).shiftKey;

            let x, y, width, height;
            let isFlippedV = dx_val * dy_val < 0;

            const DEG_THRESHOLD = 2.5;
            const DIST_THRESHOLD = 1.2; // Slightly tighter for professional feel

            const isHorizontalSnap = Math.abs(dy_val) < DIST_THRESHOLD || angleDeg < DEG_THRESHOLD || angleDeg > (180 - DEG_THRESHOLD);
            const isVerticalSnap = Math.abs(dx_val) < DIST_THRESHOLD || Math.abs(angleDeg - 90) < DEG_THRESHOLD;

            if (selectedSymbolType === 'line' && (isShiftPressed || isHorizontalSnap || isVerticalSnap)) {
                if (isShiftPressed) {
                    if (Math.abs(dx_val) > Math.abs(dy_val)) {
                        x = Math.min(drawingStart.x, currentX);
                        y = drawingStart.y;
                        width = Math.abs(currentX - drawingStart.x);
                        height = 0;
                        isFlippedV = false;
                    } else {
                        x = drawingStart.x;
                        y = Math.min(drawingStart.y, currentY);
                        width = 0;
                        height = Math.abs(currentY - drawingStart.y);
                        isFlippedV = false;
                    }
                } else if (isHorizontalSnap) {
                    x = Math.min(drawingStart.x, currentX);
                    y = drawingStart.y;
                    width = Math.abs(currentX - drawingStart.x);
                    height = 0;
                    isFlippedV = false;
                } else {
                    x = drawingStart.x;
                    y = Math.min(drawingStart.y, currentY);
                    width = 0;
                    height = Math.abs(currentY - drawingStart.y);
                    isFlippedV = false;
                }
            } else {
                x = Math.min(drawingStart.x, currentX);
                y = Math.min(drawingStart.y, currentY);
                width = Math.abs(currentX - drawingStart.x);
                height = Math.abs(currentY - drawingStart.y);

                // Symmetry for other shapes (Visual 1:1)
                if (isShiftPressed && (selectedSymbolType === 'square' || selectedSymbolType === 'circle')) {
                    const visualW = width * (page.width / 100);
                    const visualH = height * (page.height / 100);
                    const visualSize = Math.max(visualW, visualH);

                    const newWidth = (visualSize / page.width) * 100;
                    const newHeight = (visualSize / page.height) * 100;

                    width = newWidth;
                    height = newHeight;

                    // Recalculate x,y based on origin and direction
                    x = currentX < drawingStart.x ? drawingStart.x - width : drawingStart.x;
                    y = currentY < drawingStart.y ? drawingStart.y - height : drawingStart.y;
                }

                width = Math.max(0.1, width);
                height = Math.max(0.1, height);
            }

            onUpdateElement(page.id, currentElementId, {
                content: {
                    x,
                    y,
                    width,
                    height,
                    isFlippedV
                } as any
            });
        } else if (isPanning && scrollerRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;

            scrollerRef.current.scrollLeft = scrollStartRef.current.left - dx;
            scrollerRef.current.scrollTop = scrollStartRef.current.top - dy;
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setIsDrawing(false);
        setCurrentElementId(null);
    };


    return (
        <div
            ref={scrollerRef}
            className={`flex-1 flex p-8 bg-app-background/50 overflow-auto relative ${selectedTool === 'select' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                ref={containerRef}
                className={`bg-app-background border border-app-border m-auto shadow-lg rounded-lg relative ${selectedTool === 'text' || selectedTool === 'symbol' ? 'cursor-crosshair' : ''}`}
                onClick={handleCanvasClick}
            >
                {error ? (
                    <div className="p-12 text-center">
                        <p className="text-error text-lg">{error}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-lg">
                            <canvas
                                ref={canvasRef}
                                className="block max-w-none"
                            />
                        </div>
                        {/* Annotations Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {page.elements && page.elements.map((el) => {
                                if (el.type === 'text') {
                                    return (
                                        <div key={el.id} className="pointer-events-auto" data-annotation="true">
                                            <TextAnnotation
                                                element={el.content as TextElement}
                                                onUpdate={(updates: Partial<TextElement>) => onUpdateElement(page.id, el.id, { content: updates as any })}
                                                onRemove={() => onRemoveElement(page.id, el.id)}
                                                onBlur={() => setIsPlacing(null)}
                                                autoFocus={isPlacing === el.id}
                                                scale={scale}
                                            />
                                        </div>
                                    );
                                }
                                if (el.type === 'symbol') {
                                    return (
                                        <div key={el.id} className="pointer-events-auto" data-annotation="true">
                                            <SymbolAnnotation
                                                element={el.content as SymbolElement}
                                                onUpdate={(updates: Partial<SymbolElement>) => onUpdateElement(page.id, el.id, { content: updates as any })}
                                                onRemove={() => onRemoveElement(page.id, el.id)}
                                                scale={scale}
                                                isBeingCreated={currentElementId === el.id}
                                                pageWidth={page.width}
                                                pageHeight={page.height}
                                            />
                                        </div>
                                    );
                                }
                                if (el.type === 'image') {
                                    return (
                                        <div key={el.id} className="pointer-events-auto" data-annotation="true">
                                            <ImageAnnotation
                                                element={el.content as ImageElement}
                                                onUpdate={(updates: Partial<ImageElement>) => onUpdateElement(page.id, el.id, { content: updates as any })}
                                                onRemove={() => onRemoveElement(page.id, el.id)}
                                                scale={scale}
                                                pageWidth={page.width}
                                                pageHeight={page.height}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                        {/* Hidden File Input for Images */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

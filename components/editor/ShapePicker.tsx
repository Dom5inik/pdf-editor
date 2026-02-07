'use client';

import {
    Minus,
    Circle,
    Square,
    Diamond,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import type { SymbolType } from '@/lib/types';

interface ShapePickerProps {
    selectedShape: SymbolType;
    onSelect: (shape: SymbolType) => void;
    strokeWidth: number;
    onStrokeWidthSelect: (width: number) => void;
}

const SHAPES: { type: SymbolType; icon: any; label: string }[] = [
    { type: 'line', icon: Minus, label: 'Linie' },
    { type: 'circle', icon: Circle, label: 'Kreis' },
    { type: 'square', icon: Square, label: 'Rechteck' },
    { type: 'diamond', icon: Diamond, label: 'Raute' },
    { type: 'arrow-left', icon: ArrowLeft, label: 'Pfeil links' },
    { type: 'arrow-right', icon: ArrowRight, label: 'Pfeil rechts' },
];

const STROKE_WIDTHS = [1, 2, 4, 8];

export function ShapePicker({
    selectedShape,
    onSelect,
    strokeWidth,
    onStrokeWidthSelect
}: ShapePickerProps) {
    return (
        <div className="absolute right-full mr-2 bg-app-background border border-app-border shadow-xl rounded-lg p-4 flex flex-col gap-4 min-w-[300px] animate-in fade-in slide-in-from-right-2 duration-200">
            <div>
                <p className="text-[10px] uppercase font-bold text-app-muted px-1 mb-2 tracking-wider">Form</p>
                <div className="grid grid-cols-2 gap-2">
                    {SHAPES.map((shape) => (
                        <button
                            key={shape.type}
                            onClick={() => onSelect(shape.type)}
                            className={`flex items-center justify-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm whitespace-nowrap ${selectedShape === shape.type
                                ? 'bg-accent text-white border-accent shadow-sm'
                                : 'hover:bg-app-border border-transparent text-app-foreground'
                                } border`}
                            title={shape.label}
                        >
                            <shape.icon className="w-4 h-4 shrink-0" />
                            <span>{shape.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

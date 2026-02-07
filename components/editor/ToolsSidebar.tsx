import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { EDITOR_TOOLS } from '@/lib/constants';
import type { EditorTool, SymbolType } from '@/lib/types';
import * as Icons from 'lucide-react';
import { Download, FileUp, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { ShapePicker } from './ShapePicker';

interface ToolsSidebarProps {
    selectedTool: EditorTool;
    onToolSelect: (tool: EditorTool) => void;
    onDownload: () => void;
    onNewDocument: () => void;
    selectedSymbolType: SymbolType;
    onSymbolTypeSelect: (shape: SymbolType) => void;
    strokeWidth: number;
    onStrokeWidthSelect: (width: number) => void;
    layout?: 'sidebar' | 'topbar';
}

export function ToolsSidebar({
    selectedTool,
    onToolSelect,
    onDownload,
    onNewDocument,
    selectedSymbolType,
    onSymbolTypeSelect,
    strokeWidth,
    onStrokeWidthSelect,
    layout = 'sidebar',
}: ToolsSidebarProps) {
    const isSidebar = layout === 'sidebar';
    const { theme, toggleTheme } = useTheme();

    return (
        <div
            className={`bg-app-background border-app-border ${isSidebar
                ? 'w-16 border-l flex flex-col h-screen'
                : 'h-16 border-b flex items-center px-4'
                }`}
        >
            {/* Tools */}
            <div
                className={`${isSidebar ? 'flex-1 py-4 space-y-2' : 'flex gap-2 flex-1'
                    }`}
            >
                <div className={isSidebar ? 'px-2 space-y-2' : 'flex gap-2'}>
                    {EDITOR_TOOLS.map((tool) => {
                        const IconComponent = (Icons as any)[tool.icon];
                        return (
                            <div key={tool.id} className="relative">
                                <IconButton
                                    icon={IconComponent ? <IconComponent className="w-5 h-5" /> : null}
                                    label={tool.label}
                                    active={selectedTool === tool.id}
                                    onClick={() => {
                                        onToolSelect(tool.id);
                                    }}
                                />
                                {tool.id === 'symbol' && selectedTool === 'symbol' && (
                                    <ShapePicker
                                        selectedShape={selectedSymbolType}
                                        onSelect={onSymbolTypeSelect}
                                        strokeWidth={strokeWidth}
                                        onStrokeWidthSelect={onStrokeWidthSelect}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div
                className={`${isSidebar ? 'p-2 border-t border-app-border space-y-2' : 'flex gap-2'
                    }`}
            >
                <IconButton
                    icon={<Download className="w-5 h-5" />}
                    label="Herunterladen"
                    variant="accent"
                    onClick={onDownload}
                />
                <IconButton
                    icon={<FileUp className="w-5 h-5" />}
                    label="Neues Dokument"
                    onClick={onNewDocument}
                />
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';

import { FileUpload } from '@/components/upload/FileUpload';
import { PageSidebar } from '@/components/editor/PageSidebar';
import { ToolsSidebar } from '@/components/editor/ToolsSidebar';
import { PDFCanvas } from '@/components/editor/PDFCanvas';
import { usePDFEditor } from '@/hooks/usePDFEditor';
import { useResponsive } from '@/hooks/useResponsive';
import type { SymbolType } from '@/lib/types';

export default function Home() {
  const [selectedSymbolType, setSelectedSymbolType] = useState<SymbolType>('circle');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const {
    pdfDocuments,
    pages,
    currentPageIndex,
    selectedTool,
    isLoading,
    isAppending,
    fileName,
    originalFile,
    pdfDocumentObjs,
    loadPDF,
    appendPDF,
    setCurrentPage,
    selectTool,
    deletePage,
    movePage,
    addPage,
    rotatePage,
    resetEditor,
    addElement,
    updateElement,
    removeElement,
  } = usePDFEditor();

  const { isDesktop } = useResponsive();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pages.length]);

  const handleDownload = async () => {
    if (!originalFile || pages.length === 0) return;

    try {
      const { downloadModifiedPDF } = await import('@/lib/pdf/downloadUtils');
      const success = await downloadModifiedPDF(pdfDocuments, pages, fileName);

      if (!success) {
        alert('Fehler beim Herunterladen der PDF-Datei');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Fehler beim Herunterladen der PDF-Datei');
    }
  };

  // Show upload screen when no PDF loaded
  if (Object.keys(pdfDocuments).length === 0 && !isLoading) {
    return <FileUpload onFileSelect={loadPDF} />;
  }

  // Show loading state for initial load only
  if (isLoading && Object.keys(pdfDocuments).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-app-border border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-app-muted">Lade PDF...</p>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="flex h-screen overflow-hidden bg-app-background">
      {/* Left Sidebar - Page Thumbnails */}
      <PageSidebar
        pages={pages}
        currentPageIndex={currentPageIndex}
        isAppending={isAppending}
        onPageSelect={setCurrentPage}
        onPageDelete={deletePage}
        onPageRotate={rotatePage}
        onPageMove={movePage}
        onPageAppend={appendPDF}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar (on small screens) */}
        {!isDesktop && (
          <ToolsSidebar
            selectedTool={selectedTool}
            onToolSelect={selectTool}
            onDownload={handleDownload}
            onNewDocument={resetEditor}
            selectedSymbolType={selectedSymbolType}
            onSymbolTypeSelect={setSelectedSymbolType}
            strokeWidth={strokeWidth}
            onStrokeWidthSelect={setStrokeWidth}
            layout="topbar"
          />
        )}

        {/* PDF Canvas area */}
        <div className="flex-1 flex overflow-hidden relative">
          {currentPage && (
            <PDFCanvas
              page={currentPage}
              fileName={fileName}
              pdfDocument={pdfDocumentObjs[currentPage.sourceId]}
              selectedTool={selectedTool}
              selectedSymbolType={selectedSymbolType}
              strokeWidth={strokeWidth}
              onAddElement={(pageId, element) => {
                addElement(pageId, element);
                if (selectedTool === 'text' || selectedTool === 'symbol' || selectedTool === 'image') {
                  selectTool('select');
                }
              }}
              onUpdateElement={updateElement}
              onRemoveElement={removeElement}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar - Tools (on large screens) */}
      {isDesktop && (
        <ToolsSidebar
          selectedTool={selectedTool}
          onToolSelect={selectTool}
          onDownload={handleDownload}
          onNewDocument={resetEditor}
          selectedSymbolType={selectedSymbolType}
          onSymbolTypeSelect={setSelectedSymbolType}
          strokeWidth={strokeWidth}
          onStrokeWidthSelect={setStrokeWidth}
          layout="sidebar"
        />
      )}
    </div>
  );
}

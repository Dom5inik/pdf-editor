import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker configuration for Next.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function loadPDFDocument(arrayBuffer: ArrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return await loadingTask.promise;
}

export async function renderPageToCanvas(
    pdfDocument: any,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.5
) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
    };

    await page.render(renderContext).promise;
}

export async function generateThumbnail(
    pdfDocument: any,
    pageNumber: number,
    maxWidth: number = 200
): Promise<string> {
    const canvas = document.createElement('canvas');
    const page = await pdfDocument.getPage(pageNumber);

    // Calculate scale to fit maxWidth
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const context = canvas.getContext('2d');
    if (!context) return '';

    await page.render({
        canvasContext: context,
        viewport: scaledViewport,
    }).promise;

    return canvas.toDataURL('image/png');
}

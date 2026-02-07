export async function downloadModifiedPDF(
    pdfDocuments: Record<string, ArrayBuffer | File>,
    pages: Array<{
        id: string;
        pageNumber: number;
        rotation: number;
        sourceId: string;
        elements: any[];
    }>,
    fileName: string
) {
    try {
        // Import pdf-lib dynamically
        const { PDFDocument, degrees, rgb, StandardFonts, LineJoinStyle, LineCapStyle } = await import('pdf-lib');

        // Create a new PDF document
        const newPdfDoc = await PDFDocument.create();

        // Cache for loaded PDF documents and fonts
        const loadedPdfDocs: Record<string, any> = {};
        const fontCache: Record<string, any> = {};

        // Loop through each page in our editor state (which preserves the user's custom order)
        for (const page of pages) {
            if (!loadedPdfDocs[page.sourceId]) {
                const docSource = pdfDocuments[page.sourceId];
                if (!docSource) continue;

                let buffer: ArrayBuffer;
                if (docSource instanceof File) {
                    buffer = await docSource.arrayBuffer();
                } else {
                    // Clone if it's an existing ArrayBuffer to prevent detachment
                    buffer = docSource.slice(0);
                }

                loadedPdfDocs[page.sourceId] = await PDFDocument.load(buffer);
            }

            const sourceDoc = loadedPdfDocs[page.sourceId];
            const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [page.pageNumber - 1]);

            // Apply rotation (additive to existing rotation)
            const currentRotation = copiedPage.getRotation().angle;
            const finalRotation = (currentRotation + page.rotation) % 360;
            if (finalRotation !== currentRotation) {
                copiedPage.setRotation(degrees(finalRotation));
            }

            // Draw annotations
            if (page.elements && page.elements.length > 0) {
                const { width, height } = copiedPage.getSize();

                for (const el of page.elements) {
                    if (el.type === 'text') {
                        const content = el.content;

                        // PDF-lib uses StandardFonts by default. We map common font families 
                        // from the editor to their equivalent PDF standard fonts.
                        let fontName = StandardFonts.Helvetica;
                        const family = content.fontFamily.toLowerCase();

                        if (family.includes('monospace') || family.includes('courier')) {
                            fontName = StandardFonts.Courier;
                        } else if (family.includes('serif') && !family.includes('sans-serif')) {
                            fontName = StandardFonts.TimesRoman;
                        }

                        // Apply Bold/Italic
                        if (content.fontWeight === 'bold' && content.fontStyle === 'italic') {
                            if (fontName === StandardFonts.Helvetica) fontName = StandardFonts.HelveticaBoldOblique;
                            else if (fontName === StandardFonts.TimesRoman) fontName = StandardFonts.TimesRomanBoldItalic;
                            else if (fontName === StandardFonts.Courier) fontName = StandardFonts.CourierBoldOblique;
                        } else if (content.fontWeight === 'bold') {
                            if (fontName === StandardFonts.Helvetica) fontName = StandardFonts.HelveticaBold;
                            else if (fontName === StandardFonts.TimesRoman) fontName = StandardFonts.TimesRomanBold;
                            else if (fontName === StandardFonts.Courier) fontName = StandardFonts.CourierBold;
                        } else if (content.fontStyle === 'italic') {
                            if (fontName === StandardFonts.Helvetica) fontName = StandardFonts.HelveticaOblique;
                            else if (fontName === StandardFonts.TimesRoman) fontName = StandardFonts.TimesRomanItalic;
                            else if (fontName === StandardFonts.Courier) fontName = StandardFonts.CourierOblique;
                        }

                        // Embed font (cache to avoid duplication)
                        if (!fontCache[fontName]) {
                            fontCache[fontName] = await newPdfDoc.embedFont(fontName);
                        }
                        const font = fontCache[fontName];

                        // Convert hex color to RGB
                        const hex = content.color.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16) / 255;
                        const g = parseInt(hex.substring(2, 4), 16) / 255;
                        const b = parseInt(hex.substring(4, 6), 16) / 255;

                        // Calculate position (y is from bottom in PDF-lib)
                        // Calculate metrics matches Tailwind leading-[1.2]
                        // Conversion factor: Editor uses a base scale (1.5) where 16px is common.
                        // We convert these 'pixels' to PDF points based on that scale.
                        const fontSizePt = content.fontSize / 1.5;
                        const lineHeight = fontSizePt * 1.2; // Match Tailwind's leading-[1.2]

                        // PDF coordinate system is DIFFERENT from the browser:
                        // 1. Origin (0,0) is at the BOTTOM-LEFT corner.
                        // 2. Y-axis grows UPWARDS.
                        // Browser Y grows downwards, so we calculate: pdfY = (1 - percent) * pageHeight.

                        const pdfX = (content.x / 100) * width;
                        // Subtract text height (0.82em approx ascent) because drawText hooks into the baseline
                        const pdfY = (1 - content.y / 100) * height - (fontSizePt * 0.82);

                        copiedPage.drawText(content.text, {
                            x: pdfX,
                            y: pdfY,
                            size: fontSizePt,
                            lineHeight: lineHeight,
                            font: font,
                            color: rgb(r, g, b),
                        });
                    }

                    if (el.type === 'symbol') {
                        const content = el.content;
                        const hex = content.color.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16) / 255;
                        const g = parseInt(hex.substring(2, 4), 16) / 255;
                        const b = parseInt(hex.substring(4, 6), 16) / 255;
                        const color = rgb(r, g, b);

                        const sw = content.strokeWidth || 2;
                        const fill = content.fill ? color : undefined;

                        // Dimensions in points
                        const w = (content.width / 100) * width;
                        const h = (content.height / 100) * height;
                        const px = (content.x / 100) * width;
                        const py = (1 - content.y / 100) * height - h;

                        // For rotated shapes, we manualy calculate the rotated coordinates.
                        // rot is negated because PDF rotation direction is opposite to CSS.
                        const rot = -content.rotation || 0;
                        const centerX = px + w / 2;
                        const centerY = py + h / 2;

                        // Utility to transform local points into page space considering rotation
                        const rotatePt = (x: number, y: number) => {
                            const rad = (rot * Math.PI) / 180;
                            const cos = Math.cos(rad);
                            const sin = Math.sin(rad);
                            const dx = x - centerX;
                            const dy = y - centerY;
                            return {
                                x: centerX + dx * cos - dy * sin,
                                y: centerY + dx * sin + dy * cos
                            };
                        };

                        switch (content.type) {
                            case 'square':
                                copiedPage.drawRectangle({
                                    x: px, y: py, width: w, height: h,
                                    borderColor: color, borderWidth: sw, color: fill,
                                    rotate: degrees(rot)
                                });
                                break;
                            case 'circle':
                                copiedPage.drawEllipse({
                                    x: centerX, y: centerY,
                                    xScale: w / 2, yScale: h / 2,
                                    borderColor: color, borderWidth: sw, color: fill,
                                    rotate: degrees(rot)
                                });
                                break;
                            case 'line':
                                {
                                    // Handle lines (rotation is not used for lines, they use end points)
                                    // In PDF, Y is bottom-up. In SVG/Editor, Y is top-down.
                                    // isFlippedV true (backslash \ in editor) -> (px, py+h) to (px+w, py) in PDF
                                    // isFlippedV false (slash / in editor) -> (px, py) to (px+w, py+h) in PDF
                                    const y1 = content.isFlippedV ? py + h : py;
                                    const y2 = content.isFlippedV ? py : py + h;
                                    copiedPage.drawLine({
                                        start: { x: px, y: y1 },
                                        end: { x: px + w, y: y2 },
                                        color,
                                        thickness: sw
                                    });
                                }
                                break;
                            case 'diamond':
                                {
                                    // Match editor's 5% margin: "50,5 95,50 50,95 5,50"
                                    const p1 = rotatePt(px + w * 0.5, py + h * 0.95); // Top
                                    const p2 = rotatePt(px + w * 0.95, py + h * 0.5); // Right
                                    const p3 = rotatePt(px + w * 0.5, py + h * 0.05); // Bottom
                                    const p4 = rotatePt(px + w * 0.05, py + h * 0.5); // Left

                                    const drawPolyLine = (start: any, end: any) =>
                                        copiedPage.drawLine({
                                            start,
                                            end,
                                            color,
                                            thickness: sw,
                                            lineCap: LineCapStyle.Round
                                        });

                                    drawPolyLine(p1, p2);
                                    drawPolyLine(p2, p3);
                                    drawPolyLine(p3, p4);
                                    drawPolyLine(p4, p1);

                                    if (fill) {
                                        // Fill is not easily supported with individual lines, 
                                        // but for now we prioritize visibility and no-gaps.
                                    }
                                }
                                break;
                            case 'arrow-right':
                                {
                                    const pStart = rotatePt(px, py + h / 2);
                                    const pEnd = rotatePt(px + w, py + h / 2);
                                    const wingTop = rotatePt(px + w * 0.7, py + h * 0.8);
                                    const wingBottom = rotatePt(px + w * 0.7, py + h * 0.2);

                                    copiedPage.drawLine({ start: pStart, end: pEnd, color, thickness: sw });
                                    copiedPage.drawLine({ start: pEnd, end: wingTop, color, thickness: sw });
                                    copiedPage.drawLine({ start: pEnd, end: wingBottom, color, thickness: sw });
                                }
                                break;
                            case 'arrow-left':
                                {
                                    const pStart = rotatePt(px + w, py + h / 2);
                                    const pEnd = rotatePt(px, py + h / 2);
                                    const wingTop = rotatePt(px + w * 0.3, py + h * 0.8);
                                    const wingBottom = rotatePt(px + w * 0.3, py + h * 0.2);

                                    copiedPage.drawLine({ start: pStart, end: pEnd, color, thickness: sw });
                                    copiedPage.drawLine({ start: pEnd, end: wingTop, color, thickness: sw });
                                    copiedPage.drawLine({ start: pEnd, end: wingBottom, color, thickness: sw });
                                }
                                break;
                        }
                    }

                    if (el.type === 'image') {
                        const content = el.content;
                        try {
                            const base64Data = content.imageData.split(',')[1];
                            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                            let embeddedImage;
                            if (content.imageData.includes('image/png')) {
                                embeddedImage = await newPdfDoc.embedPng(imageBytes);
                            } else if (content.imageData.includes('image/jpeg') || content.imageData.includes('image/jpg')) {
                                embeddedImage = await newPdfDoc.embedJpg(imageBytes);
                            }

                            if (embeddedImage) {
                                const w = (content.width / 100) * width;
                                const h = (content.height / 100) * height;
                                const px = (content.x / 100) * width;
                                const py = (1 - content.y / 100) * height - h;

                                copiedPage.drawImage(embeddedImage, {
                                    x: px,
                                    y: py,
                                    width: w,
                                    height: h,
                                });
                            }
                        } catch (imgError) {
                            console.error('Error embedding image in PDF:', imgError);
                        }
                    }
                }
            }

            newPdfDoc.addPage(copiedPage);
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.replace('.pdf', '_bearbeitet.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Error downloading PDF:', error);
        return false;
    }
}

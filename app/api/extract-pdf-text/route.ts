import { NextRequest, NextResponse } from 'next/server';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { FILE_SIZE_LIMITS } from '@/lib/constants';

// Disable worker for server-side usage
GlobalWorkerOptions.workerSrc = '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type - be more lenient with MIME type detection
    const isPDF = file.type === 'application/pdf' ||
                  file.name.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Check file size (8MB max)
    if (file.size > FILE_SIZE_LIMITS.PDF_MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${FILE_SIZE_LIMITS.PDF_MAX_MB}MB.` },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer then Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Check if buffer has PDF magic bytes
    const pdfMagic = new TextDecoder().decode(data.slice(0, 5));
    if (!pdfMagic.startsWith('%PDF')) {
      return NextResponse.json(
        { error: 'Invalid PDF file format.' },
        { status: 400 }
      );
    }

    // Load the PDF document
    const loadingTask = getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textPages: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items into a single string
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ');

      textPages.push(pageText);
    }

    // Combine all pages
    let extractedText = textPages.join('\n\n');

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Reduce multiple blank lines
      .trim();

    // Destroy the PDF document to free memory
    await pdf.destroy();

    if (!extractedText || extractedText.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract text from PDF. The file may be scanned/image-based. Try pasting the text directly instead.',
        },
        { status: 400 }
      );
    }

    // Calculate word count
    const wordCount = extractedText.split(/\s+/).length;

    return NextResponse.json({
      text: extractedText,
      pages: numPages,
      wordCount,
      warning: wordCount < 50 ? 'Extracted text seems short. If content is missing, try pasting text directly.' : undefined,
    });

  } catch (error) {
    console.error('PDF extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide specific error messages for known issues
    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('bad XRef') || errorMessage.includes('XRef')) {
      return NextResponse.json(
        { error: 'Invalid or corrupted PDF file. Please try a different file or paste the text directly.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      return NextResponse.json(
        { error: 'PDF is password protected. Please upload an unprotected PDF or paste the text directly.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to extract text from PDF. Please try pasting the text directly instead.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

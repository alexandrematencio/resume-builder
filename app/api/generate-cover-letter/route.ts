import { NextRequest, NextResponse } from 'next/server';
import { GeneratePromptSchema, createValidationErrorResponse, logAndGetSafeError } from '@/lib/validation-schemas';
import { MAX_TOKENS } from '@/lib/constants';
import { callAnthropic } from '@/lib/anthropic-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = GeneratePromptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ...createValidationErrorResponse(validation.error) },
        { status: 400 }
      );
    }

    const { prompt } = validation.data;

    const coverLetter = await callAnthropic({
      prompt,
      maxTokens: MAX_TOKENS.COVER_LETTER,
    });

    return NextResponse.json({ coverLetter });
  } catch (error) {
    const errorMessage = logAndGetSafeError('Generate Cover Letter Error', error, 'Failed to generate cover letter');
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

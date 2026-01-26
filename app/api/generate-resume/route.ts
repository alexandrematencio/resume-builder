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

    const resume = await callAnthropic({
      prompt,
      maxTokens: MAX_TOKENS.RESUME,
    });

    return NextResponse.json({ resume });
  } catch (error) {
    const errorMessage = logAndGetSafeError('Generate Resume Error', error, 'Failed to generate resume');
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

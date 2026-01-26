import { NextRequest, NextResponse } from 'next/server';
import { SuggestProjectsSchema, createValidationErrorResponse, logAndGetSafeError } from '@/lib/validation-schemas';
import { MAX_TOKENS } from '@/lib/constants';
import { callAnthropic } from '@/lib/anthropic-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = SuggestProjectsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ...createValidationErrorResponse(validation.error) },
        { status: 400 }
      );
    }

    const { jobDescription, role, company, certifications, awards, experience } = validation.data;

    if (!jobDescription && !role) {
      return NextResponse.json(
        { error: 'Job description or role is required' },
        { status: 400 }
      );
    }

    // Build context about user's background
    const userContext: string[] = [];

    if (certifications?.length > 0) {
      userContext.push(`Certifications: ${certifications.map(c => `${c.name} (${c.issuer})`).join(', ')}`);
    }

    if (awards?.length > 0) {
      userContext.push(`Awards: ${awards.map(a => `${a.title} - ${a.issuer}`).join(', ')}`);
    }

    if (experience) {
      userContext.push(`Experience:\n${experience}`);
    }

    const prompt = `You are helping a job applicant highlight relevant projects for a job application.

JOB INFORMATION:
- Company: ${company || 'Not specified'}
- Role: ${role || 'Not specified'}
- Job Description: ${jobDescription || 'Not provided'}

CANDIDATE'S BACKGROUND:
${userContext.length > 0 ? userContext.join('\n\n') : 'No background information provided'}

TASK:
Based on the job description and the candidate's background, suggest 2-3 key projects, achievements, or certifications that would be most relevant and impressive for this specific role.

Format each project on its own line like this:
- [Project/Achievement Name] - [Brief description of impact/results]

Focus on:
1. Projects that match the job requirements
2. Quantifiable achievements when possible
3. Skills that transfer to the new role

Only output the project suggestions, nothing else. If there's not enough information, suggest generic but relevant project types for this role.`;

    const suggestions = await callAnthropic({
      prompt,
      maxTokens: MAX_TOKENS.SUGGEST_PROJECTS,
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions.trim(),
    });

  } catch (error) {
    const errorMessage = logAndGetSafeError('Suggest Projects Error', error, 'Failed to generate project suggestions');
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

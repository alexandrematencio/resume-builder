import { NextRequest, NextResponse } from 'next/server';
import type { PresenceType, SalaryRateType } from '@/app/types';
import { ParseJobDescriptionSchema, createValidationErrorResponse, logAndGetSafeError, extractJsonFromText } from '@/lib/validation-schemas';
import { MAX_TOKENS } from '@/lib/constants';
import { callAnthropic } from '@/lib/anthropic-client';

interface ParsedJobData {
  title: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryRateType: SalaryRateType | null;
  hoursPerWeek: number | null;
  presenceType: PresenceType | null;
  contractType: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  perks: string[];
}

interface ParseJobResponse {
  success: boolean;
  data: ParsedJobData | null;
  error?: string;
}

function getJobParsingPrompt(description: string): string {
  return `You are a job posting parser. Extract structured information from the following job description.

IMPORTANT EXTRACTION RULES:
1. Only extract information that is EXPLICITLY stated in the text
2. If information is not clearly mentioned, use null
3. For salary, extract the numeric values without currency symbols
4. For skills, separate "required/must have" from "nice to have/preferred"
5. Normalize skill names (e.g., "React.js" -> "React", "NodeJS" -> "Node.js")
6. For perks/benefits, use snake_case identifiers from this list when matching:
   - meal_vouchers (tickets restaurant, Swile, Edenred)
   - health_insurance (mutuelle, medical coverage)
   - dental_insurance
   - gym_membership
   - remote_budget (home office budget)
   - training_budget (learning budget, conference budget)
   - stock_options (RSU, equity)
   - bonus (performance bonus, annual bonus)
   - flexible_hours
   - unlimited_pto (unlimited vacation)
   - parental_leave
   - commute_allowance (transport, navigo)
   - company_car
   - phone_allowance
   - retirement_plan

SALARY RATE TYPE DETECTION:
- "annual": regular salary (yearly amount, common for CDI/CDD/full-time)
- "monthly": per-month salary (€/mois, $/month, "mensuel", "par mois", "monthly salary")
- "hourly": per-hour rate (€/h, $/h, "per hour", "hourly rate")
- "daily": per-day rate (TJM, "par jour", "€/day", "daily rate", common for freelance)

Look for indicators like:
- "2100€/mois", "3000$/month", "mensuel", "salaire mensuel" → monthly
- "30€/h", "50$/hour" → hourly
- "400€/jour", "TJM 500€", "daily rate" → daily
- "45k", "60000€/an", "annual salary" → annual

JOB DESCRIPTION:
${description}

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "string or null",
  "company": "string or null",
  "location": "string or null (full location string)",
  "country": "string or null (just the country)",
  "city": "string or null (just the city)",
  "salaryMin": number or null,
  "salaryMax": number or null,
  "salaryCurrency": "EUR" | "USD" | "GBP" | "CHF" or null,
  "salaryRateType": "annual" | "monthly" | "hourly" | "daily" or null,
  "hoursPerWeek": number or null,
  "presenceType": "full_remote" | "hybrid" | "on_site" or null,
  "contractType": "string or null (e.g., CDI, CDD, Freelance, Full-time, Part-time)",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "perks": ["perk_identifier1", "perk_identifier2"]
}

Notes:
- For presenceType: use "full_remote" for 100% remote, "hybrid" for partial remote, "on_site" for office-only
- salaryRateType: Use "hourly" for per-hour rates, "daily" for per-day/TJM rates, "monthly" for per-month salaries, "annual" for yearly salaries
- If rate type is unclear and salary looks like a typical annual salary (>10000), assume "annual"
- If salary is between 1000-9999 and mentions "mois", "month", "mensuel", use "monthly"
- If a salary range like "50-60k" is given, salaryMin=50000, salaryMax=60000 with salaryRateType="annual"
- If "30-40€/h" is given, salaryMin=30, salaryMax=40 with salaryRateType="hourly"
- Skills should be clean, normalized names without versions unless version is critical
- perks should use the snake_case identifiers from the list above`;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseJobResponse>> {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = ParseJobDescriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, data: null, ...createValidationErrorResponse(validation.error) },
        { status: 400 }
      );
    }

    const { description } = validation.data;
    const prompt = getJobParsingPrompt(description);

    const responseText = await callAnthropic({
      prompt,
      maxTokens: MAX_TOKENS.JOB_PARSING,
    });

    // Parse the JSON response
    let parsed: ParsedJobData;
    try {
      parsed = extractJsonFromText<ParsedJobData>(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { success: false, data: null, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Validate and sanitize the parsed data
    const sanitizedData: ParsedJobData = {
      title: typeof parsed.title === 'string' ? parsed.title : null,
      company: typeof parsed.company === 'string' ? parsed.company : null,
      location: typeof parsed.location === 'string' ? parsed.location : null,
      country: typeof parsed.country === 'string' ? parsed.country : null,
      city: typeof parsed.city === 'string' ? parsed.city : null,
      salaryMin: typeof parsed.salaryMin === 'number' ? parsed.salaryMin : null,
      salaryMax: typeof parsed.salaryMax === 'number' ? parsed.salaryMax : null,
      salaryCurrency: typeof parsed.salaryCurrency === 'string' ? parsed.salaryCurrency : null,
      salaryRateType: isValidSalaryRateType(parsed.salaryRateType) ? parsed.salaryRateType : null,
      hoursPerWeek: typeof parsed.hoursPerWeek === 'number' ? parsed.hoursPerWeek : null,
      presenceType: isValidPresenceType(parsed.presenceType) ? parsed.presenceType : null,
      contractType: typeof parsed.contractType === 'string' ? parsed.contractType : null,
      requiredSkills: Array.isArray(parsed.requiredSkills)
        ? parsed.requiredSkills.filter((s): s is string => typeof s === 'string')
        : [],
      niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills)
        ? parsed.niceToHaveSkills.filter((s): s is string => typeof s === 'string')
        : [],
      perks: Array.isArray(parsed.perks)
        ? parsed.perks.filter((p): p is string => typeof p === 'string')
        : [],
    };

    return NextResponse.json({
      success: true,
      data: sanitizedData,
    });

  } catch (error) {
    const errorMessage = logAndGetSafeError('Parse Job Description Error', error, 'Failed to parse job description');
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

function isValidPresenceType(value: unknown): value is PresenceType {
  return value === 'full_remote' || value === 'hybrid' || value === 'on_site';
}

function isValidSalaryRateType(value: unknown): value is SalaryRateType {
  return value === 'annual' || value === 'monthly' || value === 'hourly' || value === 'daily';
}

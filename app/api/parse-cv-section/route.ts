import { NextRequest, NextResponse } from 'next/server';
import type { Education, WorkExperience, Skill, SkillCategory, SkillProficiency } from '@/app/types';

type SectionType = 'education' | 'experience' | 'skills' | 'personal';

interface ParseRequest {
  section: SectionType;
  content: string;
}

interface Uncertainty {
  entryIndex: number;
  field: string;
  reason: string;
}

interface ParseResponse {
  success: boolean;
  data: Education[] | WorkExperience[] | Skill[] | PersonalInfo;
  uncertainties: Uncertainty[];
  error?: string;
}

function getEducationPrompt(content: string): string {
  return `You are extracting education information from CV/resume text. Parse the following text and extract ALL education entries you find.

For each education entry, extract:
- degree: The degree name (e.g., "Bachelor of Science", "Master's", "PhD")
- institution: The school/university name
- field: The field of study (e.g., "Computer Science", "Business Administration")
- startYear: The start year (number)
- endYear: The end year (number, null if still studying)
- current: true if currently studying, false otherwise
- gpa: GPA if mentioned (string, optional)
- honors: Any honors or distinctions (string, optional)

TEXT TO PARSE:
${content}

Respond ONLY with a valid JSON object in this exact format:
{
  "entries": [
    {
      "degree": "string",
      "institution": "string",
      "field": "string",
      "startYear": number,
      "endYear": number | null,
      "current": boolean,
      "gpa": "string or null",
      "honors": "string or null"
    }
  ],
  "uncertainties": [
    {
      "entryIndex": number,
      "field": "string",
      "reason": "string"
    }
  ]
}

Include uncertainties array to flag any fields where you had to guess or infer information. Common uncertainty reasons:
- "Date not clearly specified"
- "Degree type inferred from context"
- "Field of study not explicitly mentioned"
- "Could not determine if still ongoing"`;
}

function getExperiencePrompt(content: string): string {
  return `You are extracting work experience information from CV/resume text. Parse the following text and extract ALL work experience entries you find.

For each experience entry, extract:
- title: The job title
- company: The company name
- location: The location (city, country) if mentioned, optional
- startDate: The start date in dd-mm-yyyy format (e.g., "01-06-2020"). If only month/year is specified, use the 1st of the month.
- endDate: The end date in dd-mm-yyyy format, null if current position. If only month/year is specified, use the 1st of the month.
- current: true if current position, false otherwise
- achievements: Array of bullet points/accomplishments (strings)

IMPORTANT DATE FORMAT RULES:
- Always use dd-mm-yyyy format (day-month-year)
- If the CV says "June 2020" or "2020-06", convert to "01-06-2020"
- If the CV says "2020", use "01-01-2020"
- Day is always "01" unless explicitly specified

TEXT TO PARSE:
${content}

Respond ONLY with a valid JSON object in this exact format:
{
  "entries": [
    {
      "title": "string",
      "company": "string",
      "location": "string or null",
      "startDate": "dd-mm-yyyy",
      "endDate": "dd-mm-yyyy or null",
      "current": boolean,
      "achievements": ["string", "string"]
    }
  ],
  "uncertainties": [
    {
      "entryIndex": number,
      "field": "string",
      "reason": "string"
    }
  ]
}

Include uncertainties array to flag any fields where you had to guess or infer information. Common uncertainty reasons:
- "Day not specified, defaulted to 1st"
- "Month not specified, defaulted to January"
- "Could not determine if position is current"
- "Location not mentioned"
- "Achievements extracted from paragraph format"`;
}

function getSkillsPrompt(content: string): string {
  return `You are extracting skills information from CV/resume text. Parse the following text and extract ALL skills you find.

For each skill, extract:
- name: The skill name
- category: One of "technical", "soft", "language", or "tool"
  - technical: Programming languages, frameworks, methodologies (e.g., Python, React, Agile)
  - soft: Interpersonal skills (e.g., Leadership, Communication, Problem-solving)
  - language: Spoken/written languages (e.g., English, French, Spanish)
  - tool: Software tools and platforms (e.g., Git, Figma, Jira, AWS)
- proficiency: One of "beginner", "intermediate", "advanced", "expert", or null
  - IMPORTANT: Only set proficiency if EXPLICITLY mentioned in the text (e.g., "Expert in Python", "Advanced React")
  - If proficiency is not clearly stated, use null (do NOT infer or guess)

TEXT TO PARSE:
${content}

Respond ONLY with a valid JSON object in this exact format:
{
  "entries": [
    {
      "name": "string",
      "category": "technical" | "soft" | "language" | "tool",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert" | null
    }
  ],
  "uncertainties": [
    {
      "entryIndex": number,
      "field": "string",
      "reason": "string"
    }
  ]
}

Include uncertainties array to flag any fields where you had to guess or infer information. Common uncertainty reasons:
- "Category inferred from skill type"
- "Could be technical or tool category"
DO NOT add uncertainty for proficiency when it's null - null is the correct default when not specified.`;
}

function getPersonalPrompt(content: string): string {
  return `You are extracting personal/contact information from CV/resume text. Parse the following text and extract the person's contact details and basic information.

Extract:
- fullName: The person's full name
- email: Email address (null if not found)
- phone: Phone number (null if not found)
- address: City, country or full address (null if not found)
- age: Age as a number (null if not found; if date of birth is given, calculate age)
- languages: Array of languages with proficiency if mentioned (e.g., [{"language": "French", "proficiency": "native"}, {"language": "English", "proficiency": "professional"}])
- portfolio: Any website, LinkedIn, or portfolio URL (null if not found)

TEXT TO PARSE:
${content}

Respond ONLY with a valid JSON object in this exact format:
{
  "personal": {
    "fullName": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "age": number or null,
    "languages": [{"language": "string", "proficiency": "string"}] or [],
    "portfolio": "string or null"
  },
  "uncertainties": [
    {
      "entryIndex": 0,
      "field": "string",
      "reason": "string"
    }
  ]
}

Include uncertainties for fields you had to infer. Common reasons:
- "Name format unclear"
- "Phone format ambiguous"
- "Age calculated from date of birth"
- "Language proficiency inferred from context"`;
}

interface PersonalInfo {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  age: number | null;
  languages: { language: string; proficiency: string }[];
  portfolio: string | null;
}

function getPromptForSection(section: SectionType, content: string): string {
  switch (section) {
    case 'education':
      return getEducationPrompt(content);
    case 'experience':
      return getExperiencePrompt(content);
    case 'skills':
      return getSkillsPrompt(content);
    case 'personal':
      return getPersonalPrompt(content);
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

function processEducationEntries(entries: Array<{
  degree: string;
  institution: string;
  field: string;
  startYear: number;
  endYear: number | null;
  current: boolean;
  gpa: string | null;
  honors: string | null;
}>): Education[] {
  return entries.map(entry => ({
    id: generateId(),
    degree: entry.degree || '',
    institution: entry.institution || '',
    field: entry.field || '',
    startYear: entry.startYear || new Date().getFullYear(),
    endYear: entry.endYear || undefined,
    current: entry.current || false,
    gpa: entry.gpa || undefined,
    honors: entry.honors || undefined,
  }));
}

function processExperienceEntries(entries: Array<{
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  current: boolean;
  achievements: string[];
}>): WorkExperience[] {
  return entries.map(entry => ({
    id: generateId(),
    title: entry.title || '',
    company: entry.company || '',
    location: entry.location || undefined,
    startDate: entry.startDate || `${new Date().getFullYear()}-01`,
    endDate: entry.endDate || undefined,
    current: entry.current || false,
    achievements: entry.achievements || [],
  }));
}

function processSkillEntries(entries: Array<{
  name: string;
  category: string;
  proficiency: string | null;
}>): Skill[] {
  const validCategories: SkillCategory[] = ['technical', 'soft', 'language', 'tool'];
  const validProficiencies: SkillProficiency[] = ['beginner', 'intermediate', 'advanced', 'expert'];

  return entries.map(entry => ({
    id: generateId(),
    name: entry.name || '',
    category: (validCategories.includes(entry.category as SkillCategory)
      ? entry.category
      : 'technical') as SkillCategory,
    // Only set proficiency if it's a valid value, otherwise leave undefined (not specified)
    proficiency: entry.proficiency && validProficiencies.includes(entry.proficiency as SkillProficiency)
      ? entry.proficiency as SkillProficiency
      : undefined,
  }));
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
  try {
    const body: ParseRequest = await request.json();
    const { section, content } = body;

    if (!section || !content) {
      return NextResponse.json(
        { success: false, data: [], uncertainties: [], error: 'Missing section or content' },
        { status: 400 }
      );
    }

    if (!['education', 'experience', 'skills', 'personal'].includes(section)) {
      return NextResponse.json(
        { success: false, data: [], uncertainties: [], error: 'Invalid section type' },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { success: false, data: [], uncertainties: [], error: 'Content too long (max 50000 characters)' },
        { status: 400 }
      );
    }

    const prompt = getPromptForSection(section, content);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API Error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Parse the JSON response
    let parsedJson: Record<string, unknown>;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { success: false, data: [], uncertainties: [], error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    const uncertainties = (parsedJson.uncertainties as Uncertainty[]) || [];

    // Process based on section type
    if (section === 'personal') {
      const personal = (parsedJson.personal || parsedJson) as PersonalInfo;
      return NextResponse.json({
        success: true,
        data: personal,
        uncertainties,
      });
    }

    const entries = (parsedJson.entries as unknown[]) || [];
    let processedData: Education[] | WorkExperience[] | Skill[];
    switch (section) {
      case 'education':
        processedData = processEducationEntries(entries as Parameters<typeof processEducationEntries>[0]);
        break;
      case 'experience':
        processedData = processExperienceEntries(entries as Parameters<typeof processExperienceEntries>[0]);
        break;
      case 'skills':
        processedData = processSkillEntries(entries as Parameters<typeof processSkillEntries>[0]);
        break;
    }

    return NextResponse.json({
      success: true,
      data: processedData,
      uncertainties,
    });

  } catch (error) {
    console.error('Parse CV Section Error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        uncertainties: [],
        error: error instanceof Error ? error.message : 'Failed to parse CV section'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

interface FetchJobUrlRequest {
  url: string;
}

interface FetchJobUrlResponse {
  success: boolean;
  content: string | null;
  error?: string;
}

// List of known job board domains for better content extraction
const JOB_BOARDS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'welcometothejungle.com',
  'monster.com',
  'talent.io',
  'hired.com',
  'angel.co',
  'wellfound.com',
  'stackoverflow.com',
  'remoteok.com',
  'weworkremotely.com',
  'dribbble.com',
  'behance.net',
];

function isJobBoard(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return JOB_BOARDS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

function cleanHtmlToText(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove nav, header, footer elements (usually not job content)
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  // Convert common elements to preserve structure
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li[^>]*>/gi, '• ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&euro;/g, '€');
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));

  // Clean up whitespace
  text = text.replace(/\t/g, ' ');
  text = text.replace(/ +/g, ' ');
  text = text.replace(/\n +/g, '\n');
  text = text.replace(/ +\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

function extractMainContent(html: string): string {
  // Try to find main job content areas
  const contentPatterns = [
    // Common job description containers
    /<article[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*job-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    // JSON-LD structured data (often has job info)
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
  ];

  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Check if it's JSON-LD
      if (pattern.toString().includes('ld\\+json')) {
        try {
          const jsonData = JSON.parse(match[1]);
          if (jsonData.description) {
            return `Title: ${jsonData.title || ''}\nCompany: ${jsonData.hiringOrganization?.name || ''}\nLocation: ${jsonData.jobLocation?.address?.addressLocality || ''}\n\nDescription:\n${jsonData.description}`;
          }
        } catch {
          // Not valid JSON, continue
        }
      } else {
        const extracted = cleanHtmlToText(match[1]);
        if (extracted.length > 200) {
          return extracted;
        }
      }
    }
  }

  // Fallback: clean the entire body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return cleanHtmlToText(bodyMatch[1]);
  }

  return cleanHtmlToText(html);
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchJobUrlResponse>> {
  try {
    const body: FetchJobUrlRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, content: null, error: 'Missing URL' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { success: false, content: null, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the URL content
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, content: null, error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json(
        { success: false, content: null, error: 'URL does not return HTML content' },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Check for common anti-bot measures
    if (html.includes('captcha') || html.includes('challenge-running')) {
      return NextResponse.json(
        { success: false, content: null, error: 'The website requires verification (CAPTCHA). Please copy-paste the job description manually.' },
        { status: 403 }
      );
    }

    // Extract and clean content
    const content = extractMainContent(html);

    if (content.length < 100) {
      return NextResponse.json(
        { success: false, content: null, error: 'Could not extract meaningful content from the URL. The page may require JavaScript or login.' },
        { status: 422 }
      );
    }

    // Truncate if too long (max 50KB to avoid overwhelming the AI)
    const maxLength = 50000;
    const truncatedContent = content.length > maxLength
      ? content.slice(0, maxLength) + '\n\n[Content truncated...]'
      : content;

    return NextResponse.json({
      success: true,
      content: truncatedContent,
    });

  } catch (error) {
    console.error('Fetch Job URL Error:', error);

    // Handle specific errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, content: null, error: 'Unable to connect to the URL. Please check if the URL is correct.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'Failed to fetch job URL'
      },
      { status: 500 }
    );
  }
}

import { ANTHROPIC_API_URL, ANTHROPIC_MODEL, ANTHROPIC_API_VERSION } from './constants';

export interface AnthropicOptions {
  prompt: string;
  maxTokens: number;
  model?: string;
}

/**
 * Unified Anthropic API client
 * Consolidates duplicated fetch logic across API routes
 * @throws Error if API call fails
 */
export async function callAnthropic(options: AnthropicOptions): Promise<string> {
  const { prompt, maxTokens, model = ANTHROPIC_MODEL } = options;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    if (process.env.NODE_ENV === 'development') {
      const errorText = await response.text();
      console.error('Anthropic API Error:', errorText);
    }
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

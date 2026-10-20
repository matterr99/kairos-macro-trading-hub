/**
 * Frontend client service for interacting with the backend Gemini AI proxy (/api/gemini).
 * All authentication occurs securely on the server with process.env.GEMINI_API_KEY.
 */

export interface GeminiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
}

export interface GeminiStreamOptions extends GeminiGenerateOptions {
  onChunk: (text: string) => void;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Sends a prompt to the backend AI engine proxy and returns the aggregated text response.
 */
export async function generateMacroAIContent(options: GeminiGenerateOptions): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      model: options.model || 'gemini-3.8-flash',
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `AI proxy responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Streams a response from the backend AI engine proxy via Server-Sent Events.
 */
export async function streamMacroAIContent(options: GeminiStreamOptions): Promise<void> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        model: options.model || 'gemini-3.8-flash',
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `AI stream proxy responded with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            options.onComplete?.();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              options.onChunk(parsed.text);
            }
          } catch {}
        }
      }
    }

    options.onComplete?.();
  } catch (err: any) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

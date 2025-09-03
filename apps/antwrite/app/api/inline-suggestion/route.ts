import { NextResponse, type NextRequest } from 'next/server';
import { streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { getSessionCookie } from 'better-auth/cookies';

async function handleInlineSuggestionRequest(
  contextBefore: string,
  contextAfter: string,
  fullContent: string,
  suggestionLength: 'short' | 'medium' | 'long' = 'medium',
  customInstructions?: string | null,
  writingStyleSummary?: string | null,
  applyStyle = true,
) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let writerClosed = false;

  (async () => {
    try {
      console.log('Starting to process inline suggestion stream');

      await streamInlineSuggestion({
        contextBefore,
        contextAfter,
        fullContent,
        suggestionLength,
        customInstructions,
        writingStyleSummary,
        applyStyle,
        write: async (type, content) => {
          if (writerClosed) return;

          try {
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type,
                  content,
                })}\n\n`,
              ),
            );
          } catch (error) {
            console.error('Error writing to stream:', error);
          }
        },
      });

      if (!writerClosed) {
        try {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'finish',
                content: '',
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error('Error writing finish event:', error);
        }
      }
    } catch (e: any) {
      console.error('Error in stream processing:', e);
      if (!writerClosed) {
        try {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                content: e.message || 'An error occurred',
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error('Error writing error event:', error);
        }
      }
    } finally {
      if (!writerClosed) {
        try {
          writerClosed = true;
          await writer.close();
        } catch (error) {
          console.error('Error closing writer:', error);
        }
      }
    }
  })();

  try {
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    writerClosed = true;
    console.error('Error creating response:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const {
      contextBefore = '',
      contextAfter = '',
      fullContent = '',
      aiOptions = {},
    } = await request.json();
    const {
      suggestionLength,
      customInstructions,
      writingStyleSummary,
      applyStyle,
    } = aiOptions;

    return handleInlineSuggestionRequest(
      contextBefore,
      contextAfter,
      fullContent,
      suggestionLength,
      customInstructions,
      writingStyleSummary,
      applyStyle,
    );
  } catch (error: any) {
    console.error('Inline suggestion route error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 400 },
    );
  }
}

async function streamInlineSuggestion({
  contextBefore,
  contextAfter,
  suggestionLength,
  customInstructions,
  writingStyleSummary,
  applyStyle,
  write,
}: {
  contextBefore: string;
  contextAfter: string;
  fullContent?: string;
  suggestionLength: 'short' | 'medium' | 'long';
  customInstructions?: string | null;
  writingStyleSummary?: string | null;
  applyStyle: boolean;
  write: (type: string, content: string) => Promise<void>;
}) {
  const prompt = buildPrompt({
    contextBefore,
    contextAfter,
    suggestionLength,
    customInstructions,
    writingStyleSummary,
    applyStyle,
  });

  const maxTokens = { short: 20, medium: 50, long: 80 }[
    suggestionLength || 'medium'
  ];

  const { fullStream } = streamText({
    model: myProvider.languageModel('artifact-model'),
    prompt,
    temperature: 0.4,
    maxTokens,
  });

  let suggestionContent = '';
  for await (const delta of fullStream) {
    const { type } = delta;

    if (type === 'text-delta') {
      const { textDelta } = delta;

      suggestionContent += textDelta;
      await write('suggestion-delta', textDelta);
    }
  }
}

interface BuildPromptParams {
  contextBefore: string;
  contextAfter: string;
  suggestionLength: 'short' | 'medium' | 'long';
  customInstructions?: string | null;
  writingStyleSummary?: string | null;
  applyStyle: boolean;
}

function buildPrompt({
  contextBefore,
  contextAfter,
  suggestionLength,
  customInstructions,
  writingStyleSummary,
  applyStyle,
}: BuildPromptParams): string {
  const contextWindow = 200;
  const beforeSnippet = contextBefore.slice(-contextWindow);
  const afterSnippet = contextAfter.slice(0, contextWindow);
  const wordLimitMap = { short: 5, medium: 10, long: 15 } as const;
  const maxWords = wordLimitMap[suggestionLength] ?? 10;

  const prompt = `You are an expert autocomplete assistant completing the user's text at the cursor position marked by '▮'.

Input Format:
- Text before cursor + '▮' + any text after cursor
- Your response will be inserted directly at the cursor position

Response Rules:
1. Return ONLY the text continuation (no quotes, explanations, or commentary)
2. Provide approximately ${maxWords} words
3. Maintain proper capitalization (capitalize after sentence-ending punctuation: . ! ?)
4. Match the user's writing style, tone, and any custom instructions provided

Critical Spacing Rules:
- Word completion: If completing a partial word, do NOT add a leading space
- New word/phrase: If starting a new word after a complete word, add ONE leading space
- After punctuation: Always add a space after sentence-ending punctuation (. ! ?)
- Mid-sentence: Add appropriate spacing based on context (commas, etc.)

Examples:
- "The cat is sl▮" → "eeping on the couch" (no leading space - completing word)
- "Hello▮" → " world! How are you today?" (leading space - new word)
- "Nice weather.▮" → " I think I'll go for a walk." (leading space after sentence)

Provide natural, contextually appropriate continuations that flow seamlessly with the existing text.
${customInstructions ? `\n\nExtra instruction: ${customInstructions}` : ''}${applyStyle && writingStyleSummary ? `\n\nWriting style: ${writingStyleSummary}` : ''}

Context:
${beforeSnippet}▮${afterSnippet}`;

  return prompt;
}

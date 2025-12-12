import { NextRequest } from 'next/server';

const words = [
  'Hello', 'this', 'is', 'a', 'mock', 'streaming', 'response', 'from',
  'the', 'API', 'endpoint.', 'It', 'simulates', 'how', 'an', 'LLM',
  'would', 'stream', 'tokens', 'back', 'to', 'the', 'client.', 'Each',
  'word', 'arrives', 'with', 'a', 'small', 'delay', 'to', 'mimic',
  'real', 'AI', 'generation.', 'Pretty', 'cool', 'right?', 'This',
  'helps', 'test', 'the', 'frontend', 'streaming', 'implementation.',
];

function getRandomWords(min: number, max: number): string[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  // Read the request body (for future use)
  const body = await request.json();
  console.log('Received message:', body.message);

  // Generate random length response (10-30 words)
  const responseWords = getRandomWords(10, 30);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of responseWords) {
        controller.enqueue(encoder.encode(word + ' '));
        // Random delay between 50-150ms per word
        await sleep(Math.floor(Math.random() * 100) + 50);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
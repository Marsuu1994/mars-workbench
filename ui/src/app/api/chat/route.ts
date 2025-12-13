import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
}

const SYSTEM_INSTRUCTIONS = `You are a helpful assistant in development mode.
Keep your responses short and concise - maximum 3 sentences.`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json() as { messages: ChatMessage[] };

  if (!process.env.OPENAI_API_KEY) {
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  // Messages already in OpenAI format
  const input = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const stream = await openai.responses.create({
    model: 'gpt-5-nano',
    tools: [
      { type: "web_search" },
    ],
    instructions: SYSTEM_INSTRUCTIONS,
    reasoning: { effort: 'low' },
    input,
    stream: true,
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          controller.enqueue(encoder.encode(event.delta));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
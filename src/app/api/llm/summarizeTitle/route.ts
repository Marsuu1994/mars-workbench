import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateChat } from '@/lib/db/chats';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_INSTRUCTIONS = `Generate a short, concise title (3-5 words) for a chat conversation based on the user's first message.
Return ONLY the title, no quotes, no punctuation at the end, no explanation.`;

export async function POST(request: NextRequest) {
  const { chatId, message } = await request.json() as { chatId: string; message: string };

  if (!chatId || !message) {
    return NextResponse.json(
      { error: 'chatId and message are required' },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions: SYSTEM_INSTRUCTIONS,
      input: [{ role: 'user', content: message }],
    });

    const title = response.output_text?.trim() || 'New Chat';

    // Update chat title in database
    await updateChat(chatId, { title });

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
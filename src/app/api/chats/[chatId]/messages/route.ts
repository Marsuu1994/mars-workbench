import { NextRequest, NextResponse } from "next/server";
import { chatExists } from "@/lib/db/chats";
import { getMessagesByChatId, createMessage, isValidRole } from "@/lib/db/messages";

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

// GET /api/chats/{chatId}/messages - Get messages for a chat
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chatId } = await params;

  if (!(await chatExists(chatId))) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 }
    );
  }

  const messages = await getMessagesByChatId(chatId);
  return NextResponse.json(messages);
}

// POST /api/chats/{chatId}/messages - Add message to chat
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chatId } = await params;
  const body = await request.json();
  const { role, content } = body;

  // Validate role
  if (!role || !isValidRole(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be 'user', 'assistant', or 'system'" },
      { status: 400 }
    );
  }

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  if (!(await chatExists(chatId))) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 }
    );
  }

  const message = await createMessage(chatId, role, content);
  return NextResponse.json(message, { status: 201 });
}

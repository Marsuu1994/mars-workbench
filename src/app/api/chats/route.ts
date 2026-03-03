import { NextRequest, NextResponse } from "next/server";
import { getChats, createChat } from "@/lib/db/chats";

// GET /api/chats - List all chats
export async function GET() {
  const chats = await getChats();
  return NextResponse.json(chats);
}

// POST /api/chats - Create new chat
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, metadata } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const chat = await createChat(title, metadata);
  return NextResponse.json(chat, { status: 201 });
}

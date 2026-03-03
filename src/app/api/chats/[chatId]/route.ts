import { NextRequest, NextResponse } from "next/server";
import { getChatById, updateChat, deleteChat, chatExists } from "@/lib/db/chats";

interface RouteParams {
  params: Promise<{ chatId: string }>;
}

// GET /api/chats/{chatId} - Get single chat metadata
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chatId } = await params;

  const chat = await getChatById(chatId);

  if (!chat) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(chat);
}

// PATCH /api/chats/{chatId} - Update chat
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { chatId } = await params;
  const body = await request.json();
  const { title, metadata } = body;

  if (!(await chatExists(chatId))) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 }
    );
  }

  const chat = await updateChat(chatId, { title, metadata });
  return NextResponse.json(chat);
}

// DELETE /api/chats/{chatId} - Delete chat
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { chatId } = await params;

  if (!(await chatExists(chatId))) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 }
    );
  }

  await deleteChat(chatId);
  return new NextResponse(null, { status: 204 });
}

import { notFound } from "next/navigation";
import { getChatWithMessages } from "@/lib/db/chats";
import { ChatContainer } from "@/features/chat/components/ChatContainer";
import { Message } from "@/features/chat/store/chatStore";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  const chat = await getChatWithMessages(chatId);

  if (!chat) {
    notFound();
  }

  // Transform DB messages to store format
  const initialMessages: Message[] = chat.messages.map((msg) => ({
    content: msg.content,
    role: msg.role as "user" | "assistant",
    isStreaming: false,
  }));

  return <ChatContainer chatId={chatId} initialMessages={initialMessages} />;
}
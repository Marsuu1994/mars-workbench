import { getChats } from "@/lib/db/chats";
import Sidebar from "@/features/chat/components/Sidebar";
import ChatHeader from "@/features/chat/components/ChatHeader";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chats = await getChats();

  return (
    <div className="flex h-screen bg-base-300 text-base-content overflow-hidden">
      <Sidebar chats={chats} />
      {/* Main content */}
      <div className="flex flex-1 flex-col bg-gradient-to-b from-neutral to-base-100">
        <ChatHeader />
        {children}
      </div>
    </div>
  );
}
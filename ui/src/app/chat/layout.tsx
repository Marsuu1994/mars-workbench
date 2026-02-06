import Link from "next/link";
import { getChats } from "@/lib/db/chats";
import ChatListItem from "@/components/chat/ChatListItem";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chats = await getChats();

  return (
    <div className="flex h-screen bg-base-300 text-base-content overflow-hidden">
      {/* Sidebar - will be extracted to component */}
      <aside className="flex w-60 flex-col border-r border-base-200 bg-base-300">
        {/* Toggle button */}
        <div className="flex items-center px-1.5 py-1 border-b border-base-200">
          <button className="btn btn-ghost btn-square btn-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        {/* Add new chat button */}
        <Link href="/chat" className="flex items-center gap-1.5 px-2 py-1.5 mx-1 mt-1 rounded hover:bg-base-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-xs">Add a new chat</span>
        </Link>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <div className="text-xs font-semibold text-base-content/60 px-1.5 py-0.5">
            Your chats
          </div>
          <ul className="menu menu-xs p-0 gap-0.5 w-full">
            {chats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
            {chats.length === 0 && (
              <li className="text-base-content/50 text-xs px-1.5 py-1">
                No chats yet
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col bg-gradient-to-b from-neutral to-base-100">
        {/* Header */}
        <header className="navbar shrink-0 border-b border-base-200 bg-base-100/80">
          <div className="flex-1 justify-center">
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-success">AI</span> Chat
            </span>
          </div>
        </header>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
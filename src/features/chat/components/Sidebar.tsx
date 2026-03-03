'use client';

import Link from "next/link";
import { useState } from "react";
import ChatListItem from "./ChatListItem";

interface Chat {
  id: string;
  title: string;
}

interface SidebarProps {
  chats: Chat[];
}

export default function Sidebar({ chats }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className={`flex flex-col text-sm border-r border-base-200 bg-base-300 overflow-hidden transition-all duration-200 ${isOpen ? 'w-60' : 'w-12'}`}>
      {/* Header - Toggle button */}
      <div className="flex items-center h-10 px-2 border-b border-base-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-ghost btn-square btn-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="w-4 h-4">
            <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
            <path d="M9 4v16" />
            <path d="M14 10l2 2l-2 2" />
          </svg>
        </button>
      </div>

      {/* Functions area - scalable for future actions */}
      <div className="flex flex-col gap-1 p-2 border-b border-base-200">
        <Link
          href="/chat"
          className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors whitespace-nowrap"
          title={!isOpen ? 'Add a new chat' : undefined}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            Add a new chat
          </span>
        </Link>
        {/* Future functions can be added here */}
      </div>

      {/* Chats area - takes remaining space */}
      <div className={`flex-1 flex flex-col gap-1 p-2 overflow-y-auto transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
        <div className="font-semibold text-base-content/60 px-2 whitespace-nowrap">
          Your chats
        </div>
        <ul className="menu w-full p-0">
          {chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
          {chats.length === 0 && (
            <li className="text-base-content/50 px-2 py-1">
              No chats yet
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
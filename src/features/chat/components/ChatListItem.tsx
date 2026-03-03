'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import DeleteChatModal from './DeleteChatModal';
import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";

interface ChatListItemProps {
  chat: {
    id: string;
    title: string;
  };
}

export default function ChatListItem({ chat }: ChatListItemProps) {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isActive = pathname === `/chat/${chat.id}`;

  const handleDeleteClick = () => {
    setIsModalOpen(true);
  };

  const handleMenuToggle = (e: React.ToggleEvent<HTMLUListElement>) => {
    setIsMenuOpen(e.newState === 'open');
  };

  return (
    <>
      <li className="relative group">
        <div className={`relative flex px-0.5 py-1 items-center rounded ${isActive ? 'menu-active' : isMenuOpen ? 'menu-focus' : ''}`}>
          <Link
            href={`/chat/${chat.id}`}
            className="truncate px-1.5 py-1 text-xs rounded pr-6 w-full"
          >
            {chat.title}
          </Link>

          <button
            className={`absolute right-0 btn btn-ghost btn-xs hover:bg-transparent border-0 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            popoverTarget={`popover-${chat.id}`}
            style={{ anchorName: `--anchor-${chat.id}` }}
          >
            <EllipsisHorizontalIcon className="size-3"/>
          </button>
        </div>
      </li>
      <ul
        className="dropdown menu w-52 rounded-xl bg-base-100 shadow-sm"
        popover="auto"
        id={`popover-${chat.id}`}
        style={{ positionAnchor: `--anchor-${chat.id}` }}
        onToggle={handleMenuToggle}
      >
        <li>
          <button
            onClick={handleDeleteClick}
            className="text-error text-xs"
          >
            Delete
          </button>
        </li>
      </ul>
      <DeleteChatModal
        chatId={chat.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

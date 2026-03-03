'use client'

import { ArrowRightIcon, PaperClipIcon } from "@heroicons/react/16/solid";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@/features/chat/hooks/useChat";

export function ChatInput() {
  const [messageContent, setMessageContent] = useState('');
  const { sendMessage, isLoading } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea: 1 row default, max 3 rows, then scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate actual scrollHeight
    textarea.style.height = 'auto';

    // Get line height to calculate max height (3 rows)
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * 3;

    // Set height to scrollHeight but cap at maxHeight
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [messageContent]);

  const handleSend = () => {
    if (!messageContent.trim() || isLoading) return;
    sendMessage(messageContent);
    setMessageContent('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="py-4 shrink-0">
      <div className="mx-auto max-w-3xl flex flex-col p-4 gap-3.5 bg-white/5 backdrop-blur-lg border border-primary/60 hover:not-focus-within:border-primary hover:not-focus-within:shadow-[0_0_20px_rgba(30,180,100,0.5)] shadow-[0_0_15px_rgba(30,180,100,0.3)] focus-within:border-primary focus-within:shadow-[0_0_25px_rgba(30,180,100,0.6)] rounded-lg transition-shadow">
        <textarea
          ref={textareaRef}
          rows={1}
          className="chat-input w-full resize-none overflow-y-auto bg-transparent text-base-content placeholder:text-base-content/50 leading-tight py-1 px-0 border-none outline-none focus:outline-none focus:ring-0"
          placeholder="What's on your mind?"
          value={messageContent}
          onChange={(event) => setMessageContent(event.target.value)}
          onKeyDown={handleKeyDown}
          name="message"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
        <div className="flex justify-between">
          <button className="btn btn-ghost btn-circle" type="button">
            <PaperClipIcon className="size-6 -rotate-45" />
          </button>
          <button className="btn btn-ghost btn-circle" type="button" onClick={handleSend} disabled={isLoading}>
            <ArrowRightIcon className="size-6 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}


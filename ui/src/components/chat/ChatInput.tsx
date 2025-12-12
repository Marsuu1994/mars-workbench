'use client'

import { ArrowRightIcon, PaperClipIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import { useChat } from "@/hooks/useChat";

export function ChatInput() {
  const [messageContent, setMessageContent] = useState('');
  const { sendMessage, isLoading } = useChat();

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
      <div className="mx-auto max-w-3xl flex flex-col px-4 py-4 bg-white/5 backdrop-blur-lg border border-primary/60 hover:not-focus-within:border-primary hover:not-focus-within:shadow-[0_0_20px_rgba(30,180,100,0.5)] shadow-[0_0_15px_rgba(30,180,100,0.3)] focus-within:border-primary focus-within:shadow-[0_0_25px_rgba(30,180,100,0.6)] rounded-lg transition-shadow">
        <textarea
          className="textarea textarea-ghost w-full resize-none"
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


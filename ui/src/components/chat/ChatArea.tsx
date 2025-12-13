'use client'

import { JSX, useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { LoadingIndicator } from "@/components/chat/LoadingIndicator";
import { WelcomeMessage } from "@/components/chat/WelcomeMessage";
import { useChat } from "@/hooks/useChat";

export function ChatArea(): JSX.Element {
  const { messages, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isEmpty) {
    return <WelcomeMessage />;
  }

  return (
    <section className="flex-1 min-h-0 overflow-hidden">
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-6">
        <div className="card h-full min-h-0 bg-white/5 backdrop-blur-lg border border-primary/60 shadow-[0_0_15px_rgba(30,180,100,0.3)] rounded-lg">
          <div className="card-body gap-4 overflow-y-auto">
            <div className="space-y-3">
              {messages.map((message, i) => {
                // Show loading indicator instead of empty streaming message
                if (isLoading && message.isStreaming && message.content === '') {
                  return <LoadingIndicator key={`chat-bubble-key-${i}`} />;
                }
                return <ChatBubble key={`chat-bubble-key-${i}`} message={message} />;
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
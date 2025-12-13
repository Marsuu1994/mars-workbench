import { Message } from "@/store/chatStore";
import { JSX } from "react";

export interface ChatBubbleType {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleType): JSX.Element {
  const { role, content, isStreaming } = message;

  const chatBubbleClassName = `chat-bubble ${
    role === 'user'
      ? 'bg-success/80 backdrop-blur-lg text-black'
      : 'bg-base-200 backdrop-blur-lg text-base-content'
  }`;

  return (
    <div className={`chat ${role === 'user' ? 'chat-end' : 'chat-start'}`}>
      <div className={chatBubbleClassName}>
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  );
}
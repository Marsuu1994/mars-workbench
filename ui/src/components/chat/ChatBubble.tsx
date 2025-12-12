import { Message } from "@/store/chatStore";
import { JSX } from "react";

export interface ChatBubbleType {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleType): JSX.Element {
  const { type, content } = message;

  const chatBubbleClassName = `chat-bubble ${
    type === 'user' ?
      'bg-success/80 backdrop-blur-lg text-black' :
      'bg-base-200 backdrop-blur-lg text-base-content'
  }`;

  return (
    <div className={`chat ${type === 'user' ? 'chat-end' : 'chat-start'}`}>
      <div className={chatBubbleClassName}>
        {content}
      </div>
    </div>
  );
}
import { Header } from "@/components/common/Header";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatArea } from "@/components/chat/ChatArea";

export default function HomePage() {
  return (
    <main className="h-screen bg-base-300 text-base-content overflow-hidden">
      <div className="flex h-full flex-col bg-gradient-to-b from-neutral to-base-100">
        <Header/>
        <ChatArea/>
        <ChatInput/>
      </div>
    </main>
  );
}



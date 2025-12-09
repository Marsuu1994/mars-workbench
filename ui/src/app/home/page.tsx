import { Header } from "@/components/common/Header";
import { ChatInput } from "@/components/chat/ChatInput";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base-300 text-base-content">
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-neutral to-base-300">
        <Header />

        <section className="flex-1">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-6">
            <div className="card h-full border border-base-200 bg-base-100/80 shadow-lg">
              <div className="card-body gap-4 overflow-y-auto">
                <div className="badge badge-success badge-lg w-fit text-black">
                  Chat
                </div>
                <p className="text-base-content/80">
                  Messages will appear here. We&rsquo;ll wire streaming soon.
                </p>
                <div className="space-y-3">
                  <div className="chat chat-start">
                    <div className="chat-bubble bg-base-200 text-base-content">
                      How do we add server actions?
                    </div>
                  </div>
                  <div className="chat chat-end">
                    <div className="chat-bubble bg-success text-black">
                      Use Next.js Server Actions, then stream tokens to the UI.
                    </div>
                  </div>
                  <div className="chat chat-end">
                    <div className="chat-bubble bg-success text-black">
                      I can scaffold the endpoint when you&rsquo;re ready.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ChatInput />
      </div>
    </main>
  );
}



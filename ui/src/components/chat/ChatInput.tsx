import { ArrowRightIcon, PaperClipIcon } from "@heroicons/react/16/solid";

export function ChatInput() {
  return (
    <div className="py-4">
      <div className="mx-auto max-w-3xl flex flex-col px-4 py-4 border border-base-100 hover:border-base-300 rounded-lg">
        <textarea
          className="textarea textarea-ghost w-full resize-none"
          placeholder="Ask anything about the stack or your chat flow..."
          name="message"
        />
        <div className="flex justify-between">
          <button className="btn btn-ghost btn-circle" type="button">
            <PaperClipIcon className="size-6 -rotate-45" />
          </button>
          <button className="btn btn-ghost btn-circle" type="button">
            <ArrowRightIcon className="size-6 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}


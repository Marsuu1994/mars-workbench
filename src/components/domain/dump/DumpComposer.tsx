'use client';

import {useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {PaperAirplaneIcon} from '@heroicons/react/24/outline';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {FormErrorAlert} from '@/components/ui/form/FormErrorAlert';
import {DUMP_ENTRY_MAX_LENGTH} from '@/utils/dump';

interface DumpComposerProps {
  captureError: string | null;
  onCapture: (content: string) => Promise<{ok: boolean}>;
}

/** The capture console: an auto-growing, IME-safe textarea. Enter inserts a
 *  newline; ⌘/Ctrl+Enter dumps (inverse of the AI chat composer). */
export const DumpComposer = ({captureError, onCapture}: DumpComposerProps) => {
  const t = useTranslations('Dump');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = !isSubmitting && content.trim().length > 0;

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const resetHeight = () => {
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';
  };

  const submit = async () => {
    if (!canSubmit) return;
    const text = content;
    setContent(''); // optimistic clear
    requestAnimationFrame(resetHeight);
    setIsSubmitting(true);
    const {ok} = await onCapture(text);
    setIsSubmitting(false);
    if (!ok) {
      setContent(text); // restore on failure
      requestAnimationFrame(autoGrow);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter that commits an IME composition (e.g. a Chinese/Japanese
    // candidate) — it must commit the text, not dump.
    if (event.nativeEvent.isComposing) return;
    // Enter = newline (fall through); ⌘/Ctrl+Enter = dump.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border border-base-content/10 bg-base-100 p-3.5 transition-colors focus-within:border-primary">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={event => {
            setContent(event.target.value);
            autoGrow();
          }}
          onKeyDown={handleKeyDown}
          maxLength={DUMP_ENTRY_MAX_LENGTH}
          placeholder={t('placeholder')}
          // text-base (16px) on mobile stops iOS Safari from zooming in on
          // focus; md:text-sm keeps the denser desktop size. The wrapper box
          // shows focus (focus-within:border-primary), so the field opts out
          // of the app-wide focus ring to avoid a double highlight.
          className="min-h-[72px] max-h-64 w-full resize-none border-none bg-transparent text-base md:text-sm leading-relaxed outline-none focus-visible:outline-none! placeholder:text-base-content/40"
        />
        <div className="mt-1 flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[11px] text-base-content/40 md:flex">
            <kbd className="kbd kbd-xs">⌘</kbd>
            <kbd className="kbd kbd-xs">↵</kbd>
            {t('composerHint')}
          </span>
          <SubmitButton
            type="button"
            onClick={submit}
            isSubmitting={isSubmitting}
            disabled={!canSubmit}
            icon={<PaperAirplaneIcon className="size-4" />}
            className="btn-sm ml-auto px-5"
          >
            {t('dumpButton')}
          </SubmitButton>
        </div>
      </div>
      <FormErrorAlert error={captureError} />
    </div>
  );
};

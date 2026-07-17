'use client';

import {useEffect} from 'react';
import {useAiPlanChatStore} from '@/store/aiPlanChatStore';
import {AiChatModalContent} from '@/components/domain/plan/ai-chat/AiPlanChatModal';
import type {AiChatSeed} from './fixtures';

/**
 * The real chat-modal content rendered inline (the live modal's OverlayShell
 * is a top-layer <dialog> that would escape the scenario frame), fed by
 * seeding the global aiPlanChatStore.
 *
 * Seeding happens in an effect (a render-time setState would notify the
 * previous tab's still-mounted subscribers mid-render), and the content only
 * mounts once the store carries THIS tab's seed — checked by reference, so a
 * neighbouring tab's leftover conversation never flashes. `isOpen` is never
 * seeded — flipping it would pop the real top-layer modal wherever a PlanForm
 * is mounted. The store is a module singleton, so the unmount cleanup resets
 * the conversation; ScenarioTabs remounts this component per tab, which
 * re-seeds it.
 */
export const AiChatScenario = ({seed}: {seed: AiChatSeed}) => {
  const isSeeded = useAiPlanChatStore(
    state => state.messages === seed.messages,
  );

  useEffect(() => {
    useAiPlanChatStore.setState({
      chatId: 'scn-chat',
      messages: seed.messages,
      input: '',
      status: seed.status,
      error: seed.error ?? null,
      latestDraft: seed.latestDraft ?? null,
      createdPlanId: seed.createdPlanId ?? null,
    });
    return () => {
      useAiPlanChatStore.getState().reset();
    };
  }, [seed]);

  return (
    // Mirrors the live OverlayShell box (h-[700px] max-h-[80vh] w-[640px]);
    // max-h-full clamps to the frame's padded interior. The dimmed backdrop
    // and centering come from the frame's overlay mode.
    <div className="fx-panel-solid rounded-box flex h-[700px] max-h-full w-full max-w-[640px] flex-col overflow-hidden p-0">
      {isSeeded && <AiChatModalContent />}
    </div>
  );
};

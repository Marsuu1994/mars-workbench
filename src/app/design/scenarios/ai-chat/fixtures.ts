import {TaskType, TaskSize} from '@/utils/enums';
import type {DraftPlanResponse} from '@/schemas';
import type {UiMessage} from '@/types/aiChat';
import type {AiChatStatus} from '@/store/aiPlanChatStore';

/* AI-chat scenario fixtures — store seeds for each chat lifecycle state.
   Copy mirrors the static i18n content (AiChat.welcomeNew / chips) so the
   pinned frames read exactly like the live modal. */

export interface AiChatSeed {
  messages: UiMessage[];
  status: AiChatStatus;
  error?: string | null;
  latestDraft?: DraftPlanResponse | null;
  createdPlanId?: string | null;
}

const WELCOME_NEW: UiMessage = {
  id: 'scn-m1',
  role: 'assistant',
  type: 'welcome',
  text: "Hi! I'm your planning assistant. Tell me what you'd like to focus on this period and I'll draft a plan of daily and weekly tasks for you. You can refine it together before adding anything to your board.",
  chips: [
    "I'm preparing for tech interviews",
    'Help me build a fitness routine',
    'I want to learn a new skill',
  ],
};

const WELCOME_RETURNING: UiMessage = {
  id: 'scn-m1',
  role: 'assistant',
  type: 'welcome',
  text: 'Welcome back! Last period you completed 12 of 16 tasks (75%) and earned 47 points. Your daily habits hit 90%. Want to keep this plan, adjust the difficulty, or try something new?',
  chips: ['Keep the same plan', 'Adjust difficulty', 'Try something new'],
};

const USER_GOALS: UiMessage = {
  id: 'scn-m2',
  role: 'user',
  type: 'user',
  text: "I'm preparing for FAANG interviews over the next two months. I want daily coding practice and system design, but keep my gym routine going.",
};

const USER_FEEDBACK: UiMessage = {
  id: 'scn-m4',
  role: 'user',
  type: 'user',
  text: 'Too many daily tasks — drop the gym.',
};

/** First draft — 5 templates, 4 new + 1 existing (drives the summary math). */
const DRAFT_V1: DraftPlanResponse = {
  message: "Here's a structured plan for your FAANG prep:",
  description: 'FAANG interview prep',
  draftTemplates: [
    {
      templateId: null,
      title: 'Solve 3 LeetCode problems',
      description: 'Mix of medium and hard, timed',
      type: TaskType.DAILY,
      frequency: 1,
      size: TaskSize.MEDIUM,
    },
    {
      templateId: null,
      title: 'Study system design chapter',
      description: 'One chapter with notes',
      type: TaskType.WEEKLY,
      frequency: 1,
      size: TaskSize.LARGE,
    },
    {
      templateId: null,
      title: 'Mock behavioral interview',
      description: 'One full loop with written feedback',
      type: TaskType.WEEKLY,
      frequency: 1,
      size: TaskSize.MEDIUM,
    },
    {
      templateId: null,
      title: 'Gym workout (push/pull/legs)',
      description: 'Keep the current split going',
      type: TaskType.DAILY,
      frequency: 1,
      size: TaskSize.SMALL,
    },
    {
      templateId: 'tpl-read',
      title: 'Read 30 pages',
      description: 'Current book club pick',
      type: TaskType.DAILY,
      frequency: 1,
      size: TaskSize.SMALL,
    },
  ],
  followUp:
    "That's about 25 points per day. Want me to adjust the load or swap anything?",
};

/** Revised draft — 3 templates, 2 new + 1 existing. Deliberately short so
    the rejected + revised frame shows the collapsed previous draft, the
    feedback and the full revision without scrolling. */
const DRAFT_V2: DraftPlanResponse = {
  message: 'Slimmed down, with system design as a weekly deep-dive:',
  description: 'FAANG interview prep',
  draftTemplates: [
    {
      templateId: null,
      title: 'Solve 3 LeetCode problems',
      description: 'Mix of medium and hard, timed',
      type: TaskType.DAILY,
      frequency: 1,
      size: TaskSize.MEDIUM,
    },
    {
      templateId: null,
      title: 'System design deep-dive',
      description: 'Two focused sessions with diagrams',
      type: TaskType.WEEKLY,
      frequency: 2,
      size: TaskSize.LARGE,
    },
    {
      templateId: 'tpl-read',
      title: 'Read 30 pages',
      description: 'Current book club pick',
      type: TaskType.DAILY,
      frequency: 1,
      size: TaskSize.SMALL,
    },
  ],
  followUp: 'Daily load is now ~5 points. Ready to create it?',
};

const draftMessage = (
  id: string,
  draft: DraftPlanResponse,
  approved = false,
): UiMessage => ({
  id,
  role: 'assistant',
  type: 'draft',
  draft,
  ...(approved ? {approved: true} : {}),
});

/** One entry per chat lifecycle state, in the tab order shown on the page. */
export const AI_CHAT_SEEDS: {
  label: string;
  title: string;
  note: string;
  seed: AiChatSeed;
}[] = [
  {
    label: 'Welcome (new)',
    title: 'Welcome — new user',
    note: 'First-ever chat: static greeting with quick-start suggestion chips.',
    seed: {messages: [WELCOME_NEW], status: 'idle'},
  },
  {
    label: 'Welcome (returning)',
    title: 'Welcome — returning user',
    note: "Last period's stats recapped in the greeting; chips switch to keep/adjust/try.",
    seed: {messages: [WELCOME_RETURNING], status: 'idle'},
  },
  {
    label: 'Generating',
    title: 'Generating — loading state',
    note: 'Draft generation in flight: loading bubble, input disabled.',
    seed: {messages: [WELCOME_NEW, USER_GOALS], status: 'generating'},
  },
  {
    label: 'Draft generated',
    title: 'Draft plan generated',
    note: 'Draft cards with the refine input and the persistent create bar (4 new · 1 existing).',
    seed: {
      messages: [WELCOME_NEW, USER_GOALS, draftMessage('scn-m3', DRAFT_V1)],
      status: 'idle',
      latestDraft: DRAFT_V1,
    },
  },
  // The rejected/created conversations start at the superseded draft (no
  // welcome/goals turns) so the collapsed previous-draft row stays in view
  // without scrolling.
  {
    label: 'Rejected + revised',
    title: 'Rejected + revised draft',
    note: 'The superseded draft collapses to an expandable one-liner; the revision becomes the approvable draft.',
    seed: {
      messages: [
        draftMessage('scn-m3', DRAFT_V1),
        USER_FEEDBACK,
        draftMessage('scn-m5', DRAFT_V2),
      ],
      status: 'idle',
      latestDraft: DRAFT_V2,
    },
  },
  {
    label: 'Plan created',
    title: 'Plan created — success',
    note: 'Approved draft gets the Created badge; the input is replaced by the success banner.',
    seed: {
      messages: [
        draftMessage('scn-m3', DRAFT_V1),
        USER_FEEDBACK,
        draftMessage('scn-m5', DRAFT_V2, true),
      ],
      status: 'created',
      latestDraft: DRAFT_V2,
      createdPlanId: 'scn-plan',
    },
  },
  {
    label: 'Initializing',
    title: 'Initializing — bootstrapping the chat',
    note: 'Modal just opened; the create-chat action is in flight.',
    seed: {messages: [], status: 'initializing'},
  },
  {
    label: 'Generation error',
    title: 'Generation error — recoverable failure',
    note: 'Error strip above the input; the input stays enabled for a retry.',
    seed: {
      messages: [WELCOME_NEW, USER_GOALS],
      status: 'idle',
      error: "Couldn't generate a plan, please try again.",
    },
  },
];

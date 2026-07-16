import {TaskSize} from '@/utils/enums';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';

/* Task-modal scenario fixtures — the shared task form across its three
   contexts (new template / edit template / add priority task). */

const NOW = new Date('2026-07-10T15:00:00');

/** Edit-mode template — XL so the split-it-up size warning shows. */
export const EDIT_TEMPLATE: TaskTemplateItem = {
  id: 'scn-tpl-gym',
  userId: 'scn-user',
  title: 'Go to gym',
  description: '30 min workout focusing on compound lifts',
  size: TaskSize.EXTRA_LARGE,
  isArchived: false,
  createdAt: NOW,
  updatedAt: NOW,
};

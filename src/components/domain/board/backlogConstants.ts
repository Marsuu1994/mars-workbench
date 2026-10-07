import {TaskStatus} from '@/utils/enums';

/** Desktop backlog stacks each get their own Droppable: `BACKLOG:<stack key>`. */
export const BACKLOG_DROPPABLE_PREFIX = `${TaskStatus.BACKLOG}:`;

import type {DraftTemplate} from '../types/aiChat';

/**
 * Roll up a draft's templates into the counts shown in the create bar / success
 * banner. A `templateId === null` entry is a brand-new template; the rest reuse
 * existing ones.
 */
export function summarizeDraftTemplates(templates: DraftTemplate[]): {
  total: number;
  newCount: number;
  existing: number;
} {
  const total = templates.length;
  const newCount = templates.filter(t => t.templateId === null).length;
  return {total, newCount, existing: total - newCount};
}

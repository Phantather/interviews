import type { Pair } from './survey/flatten';
import type { Lang } from './i18n';

export type SubmitPayload = {
  lang: Lang;
  durationMin: number;
  answers: Pair[];
  /** поле-ловушка: у человека всегда пустое */
  company?: string;
};

export async function submitSurvey(payload: SubmitPayload): Promise<string> {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`submit failed: ${response.status}`);
  const data = (await response.json()) as { ok?: boolean; number?: string };
  if (!data.ok) throw new Error('submit rejected');
  return data.number ?? '';
}

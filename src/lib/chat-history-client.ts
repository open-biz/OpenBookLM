import { normalizeHistory } from '../../cloudflare/contracts.mjs';

export async function getChatHistory(_userId: string, notebookId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/chat/history?notebookId=${encodeURIComponent(notebookId)}`, { cache: 'no-store', credentials: 'same-origin', signal });
  if (!response.ok) throw new Error('Could not load chat history');
  return normalizeHistory(await response.json());
}

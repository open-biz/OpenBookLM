export type Message = { role: 'user' | 'assistant' | 'system'; content: string };
export type Route = { kind: 'home' } | { kind: 'privacy' } | { kind: 'notebook'; id: string } | { kind: 'missing' };
export type NotebookCard = { id: string; title: string; sources: any[]; createdAt: string; updatedAt: string; role: string; ownerName: string; userId: string };
export function resolveRoute(pathname: string): Route;
export function normalizeHistory(value: unknown): Message[];
export function completionText(value: unknown): string;
export function mayBootstrapNotebooks(session: { user?: { id: string } } | null, user: { id: string; isGuest: boolean } | null): boolean;
export function serializeNotebookCards(notebooks: { id: string; title: string; sources: any[]; userId: string; user: { name: string | null }; sharedWith: { id: string }[]; createdAt: string | Date; updatedAt: string | Date }[], userId: string): NotebookCard[];

export function resolveRoute(pathname) {
  if (pathname === '/' || pathname === '') return { kind: 'home' };
  if (/^\/privacy\/?$/.test(pathname)) return { kind: 'privacy' };
  const match = pathname.match(/^\/notebook\/([^/]+)\/?$/);
  if (match) {
    try { return { kind: 'notebook', id: decodeURIComponent(match[1]) }; } catch { return { kind: 'missing' }; }
  }
  return { kind: 'missing' };
}

export function normalizeHistory(value) {
  const messages = Array.isArray(value) ? value : value?.messages;
  if (!Array.isArray(messages)) return [];
  return messages.filter(message => message && typeof message.content === 'string' && ['user', 'assistant', 'system'].includes(String(message.role).toLowerCase()))
    .map(message => ({ role: String(message.role).toLowerCase(), content: message.content }));
}

export function completionText(value) {
  const text = value?.choices?.[0]?.message?.content ?? value?.content;
  if (typeof text !== 'string') throw new Error('Invalid response from chat completion API');
  return text;
}

export function mayBootstrapNotebooks(session, user) {
  if (!user) return false;
  return session?.user ? session.user.id === user.id : user.isGuest === true;
}

export function serializeNotebookCards(notebooks, userId) {
  return notebooks.map(notebook => ({
    id: notebook.id,
    title: notebook.title,
    sources: notebook.sources,
    createdAt: new Date(notebook.createdAt).toISOString(),
    updatedAt: new Date(notebook.updatedAt).toISOString(),
    role: notebook.userId === userId ? 'Owner' : notebook.sharedWith.some(user => user.id === userId) ? 'Editor' : 'Reader',
    ownerName: notebook.user.name || 'Unknown',
    userId: notebook.userId,
  }));
}

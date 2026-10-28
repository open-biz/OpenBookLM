import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, normalizeHistory, completionText, mayBootstrapNotebooks, serializeNotebookCards } from './contracts.mjs';

test('runtime notebook identifiers and missing paths are routed deliberately', () => {
  assert.deepEqual(resolveRoute('/notebook/private%20id'), { kind: 'notebook', id: 'private id' });
  assert.equal(resolveRoute('/notebook/a/extra').kind, 'missing');
  assert.equal(resolveRoute('/notebook/%ZZ').kind, 'missing');
  assert.equal(resolveRoute('/privacy/').kind, 'privacy');
});
test('cached object and SQL fallback history have the same browser DTO', () => {
  const messages = [{ role: 'USER', content: 'hello' }, { role: 'assistant', content: 'hi' }];
  assert.deepEqual(normalizeHistory(messages), normalizeHistory({ messages }));
  assert.deepEqual(normalizeHistory({ messages: [{ role: 'admin', content: 'ignore' }, { role: 'user' }] }), []);
});
test('existing non-streaming completion is decoded without chunk-boundary assumptions', async () => {
  const payload = JSON.stringify({ choices: [{ message: { content: 'complete response' } }] });
  const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(payload.slice(0, 11))); controller.enqueue(new TextEncoder().encode(payload.slice(11))); controller.close(); } });
  assert.equal(completionText(await new Response(body).json()), 'complete response');
  assert.throws(() => completionText({ choices: [] }));
});
test('owned, shared and bookmarked notebooks retain role metadata without exposing owner credentials', () => {
  const row = { id: 'n', title: 'test', sources: [], userId: 'owner', user: { name: 'Owner', email: 'private', password: 'private' }, sharedWith: [{ id: 'editor' }], createdAt: '2026-01-01', updatedAt: '2026-01-02' };
  assert.equal(serializeNotebookCards([row], 'owner')[0].role, 'Owner');
  assert.equal(serializeNotebookCards([row], 'editor')[0].role, 'Editor');
  const card = serializeNotebookCards([row], 'bookmark-reader')[0];
  assert.equal(card.role, 'Reader');
  assert.equal(card.ownerName, 'Owner');
  assert.equal('user' in card, false);
  assert.equal('sharedWith' in card, false);
});
test('bootstrap rejects registered identities supplied through a guest cookie', () => {
  assert.equal(mayBootstrapNotebooks(null, { id: 'registered', isGuest: false }), false);
  assert.equal(mayBootstrapNotebooks(null, { id: 'guest', isGuest: true }), true);
  assert.equal(mayBootstrapNotebooks({ user: { id: 'registered' } }, { id: 'registered', isGuest: false }), true);
  assert.equal(mayBootstrapNotebooks({ user: { id: 'other' } }, { id: 'registered', isGuest: false }), false);
});

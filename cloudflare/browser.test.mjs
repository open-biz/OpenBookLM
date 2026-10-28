import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

test('Pages UI: notebook lists, deep links, JSON chat, auth errors and navigation', { timeout: 60000 }, async () => {
  const dist = path.resolve(import.meta.dirname, '../pages-dist');
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://fixture').pathname;
    const file = pathname.startsWith('/assets/') || pathname.startsWith('/fonts/') || /\.(png|svg|ico)$/.test(pathname) ? pathname : '/index.html';
    try {
      const body = await readFile(path.join(dist, file));
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.woff2') ? 'font/woff2' : 'image/png');
      res.end(body);
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const errors = [], requests = [], fontLoads = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().includes('/fonts/inter/') && response.url().endsWith('.woff2')) fontLoads.push({ url: response.url(), status: response.status() }); });
    const consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const date = '2026-01-01T00:00:00.000Z';
    let authenticated = true;
    let userId = 'fixture-user';
    let releaseSlow, startedSlow;
    const slowStarted = new Promise(resolve => { startedSlow = resolve; });
    const slowRelease = new Promise(resolve => { releaseSlow = resolve; });
    const notebooks = ['owned', 'shared', 'bookmarked'].map((id, index) => ({ id, title: `Fixture ${id}`, sources: [], createdAt: date, updatedAt: date, role: ['Owner', 'Editor', 'Reader'][index], ownerName: 'Fixture Owner', userId: index ? 'other' : 'fixture-user' }));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.fulfill({ json: { stargazers_count: 0, forks_count: 0 } });
      if (!url.pathname.startsWith('/api/')) return route.continue();
      requests.push(url.pathname);
      if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: authenticated ? { session: { id: 'fixture-session', userId, expiresAt: '2099-01-01T00:00:00Z' }, user: { id: userId, name: 'Fixture User', email: 'fixture@example.invalid' } } : null });
      if (url.pathname === '/api/auth/sign-out') { authenticated = false; return route.fulfill({ json: { success: true } }); }
      if (url.pathname === '/api/notebooks/slow') {
        if (!authenticated) return route.fulfill({ status: 403, json: { error: 'Notebook access denied' } });
        startedSlow();
        await slowRelease;
        return route.fulfill({ json: { id: 'slow', title: 'Stale private notebook', notes: [], sources: [] } }).catch(() => {});
      }
      if (url.pathname === '/api/pages/bootstrap') return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { notebooks } : { error: 'Unauthorized' } });
      if (url.pathname === '/api/user') return route.fulfill({ json: { id: 'fixture-user', isGuest: false } });
      if (url.pathname === '/api/credits/usage') return route.fulfill({ json: [] });
      if (url.pathname === '/api/chat/history') return route.fulfill({ json: { messages: [{ role: 'user', content: 'Fixture previous message' }] } });
      if (url.pathname === '/api/chat') return route.fulfill({ json: { choices: [{ message: { content: 'Fixture complete AI response' } }] } });
      if (url.pathname === '/api/notebooks/forbidden') return route.fulfill({ status: 403, json: { error: 'Notebook access denied' } });
      if (url.pathname === '/api/notebooks/owned' && userId !== 'fixture-user') return route.fulfill({ status: 403, json: { error: 'Notebook access denied' } });
      if (url.pathname === '/api/notebooks/owned') return route.fulfill({ json: { id: 'owned', title: 'Fixture owned', content: '', description: '', notes: [], sources: [{ id: 'source', title: 'Fixture source', content: 'Fixture source text', type: 'TEXT', notebookId: 'owned', createdAt: date, updatedAt: date }] } });
      return route.fulfill({ status: 404, json: { error: 'Unknown fixture endpoint' } });
    });
    await page.goto(origin);
    await page.getByRole('link', { name: /Fixture owned/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /^Inter,/);
    assert(await page.evaluate(() => Array.from(document.fonts).some(face => face.family === 'Inter' && face.status === 'loaded')));
    assert(fontLoads.some(font => font.status === 200));
    assert.equal(await page.locator('a[href="/notebook/shared"]').count(), 1);
    assert.equal(await page.locator('a[href="/notebook/bookmarked"]').count(), 1);
    await page.locator('a[href="/notebook/owned"]').click();
    await page.getByText('Fixture previous message', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Fixture previous message', { exact: true }).waitFor();
    await page.locator('textarea').fill('Fixture question');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await page.getByText('Fixture complete AI response', { exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('link', { name: /Fixture owned/ }).waitFor();
    await page.goForward();
    await page.getByText('Fixture previous message', { exact: true }).waitFor();
    await page.goto(`${origin}/notebook/forbidden`);
    await page.getByText('Notebook access denied', { exact: true }).waitFor();
    await page.goto(`${origin}/privacy`);
    await page.getByRole('heading', { name: 'Privacy Policy' }).waitFor();
    await page.goto(`${origin}/missing-private-route`);
    await page.getByRole('heading', { name: 'Page not found' }).waitFor();
    await page.goto(`${origin}/notebook/owned`);
    await page.getByText('Fixture previous message', { exact: true }).waitFor();
    userId = 'fixture-other-user';
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.getByText('Notebook access denied', { exact: true }).waitFor();
    assert.equal(await page.getByText('Fixture previous message', { exact: true }).count(), 0);
    await page.goto(`${origin}/notebook/slow`);
    await slowStarted;
    await page.getByRole('button', { name: 'F', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await page.getByText('Notebook access denied', { exact: true }).waitFor();
    releaseSlow();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.getByText('Stale private notebook', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Fixture previous message', { exact: true }).count(), 0);
    await page.goto(origin);
    await page.getByRole('alert').filter({ hasText: 'Please sign in to view your notebooks.' }).waitFor();
    assert.equal(await page.locator('a[href="/notebook/owned"]').count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors.filter(message => !/Failed to load resource:.*(?:401|403|404)|Error fetching notebook: Error: Notebook access denied/.test(message)), []);
    assert(requests.includes('/api/chat'));
    assert(!requests.includes('/api/test-redis'));
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

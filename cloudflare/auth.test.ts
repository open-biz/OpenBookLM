import { beforeEach, expect, mock, test } from 'bun:test';
import path from 'node:path';

const registered = { id: 'registered', isGuest: false };
const guest = { id: 'guest', isGuest: true };
let session: { user: { id: string } } | null = null;
let cookieId: string | undefined;
let initialized: string[] = [];
let writes: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
let creations = 0;

mock.module('better-auth', () => ({ betterAuth: () => ({ api: { getSession: async () => session } }) }));
mock.module('better-auth/adapters/prisma', () => ({ prismaAdapter: () => ({}) }));
mock.module('better-auth/plugins', () => ({ magicLink: () => ({}) }));
mock.module('nanoid', () => ({ nanoid: () => 'random-fixture' }));
mock.module('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => cookieId ? { value: cookieId } : undefined, set: (name: string, value: string, options: Record<string, unknown>) => writes.push({ name, value, options }) }),
}));
mock.module(path.resolve(import.meta.dirname, '../src/lib/db.ts'), () => ({ prisma: { user: {
  findUnique: async ({ where }: { where: { id: string } }) => where.id === registered.id ? registered : where.id === guest.id ? guest : null,
  create: async () => { creations++; return { id: 'new-guest', isGuest: true }; },
} } }));
mock.module(path.resolve(import.meta.dirname, '../src/lib/credit-manager.ts'), () => ({ CreditManager: { initializeGuestCredits: async (id: string) => initialized.push(id) } }));

const { getCurrentUser, getOrCreateUser } = await import('../src/lib/auth');

beforeEach(() => { session = null; cookieId = undefined; initialized = []; writes = []; creations = 0; });

test('an unsigned guest cookie cannot impersonate a registered account on reads', async () => {
  cookieId = registered.id;
  expect(await getCurrentUser()).toBeNull();
  expect(creations).toBe(0);
});
test('forged registered cookie is replaced by a legitimate guest when guest creation is requested', async () => {
  cookieId = registered.id;
  expect(await getOrCreateUser(true)).toEqual({ id: 'new-guest', isGuest: true });
  expect(initialized).toEqual(['new-guest']);
  expect(writes[0].name).toBe('openbooklm_guest_id');
  expect(writes[0].value).toBe('new-guest');
  expect(writes[0].options.httpOnly).toBe(true);
  expect(writes[0].options.sameSite).toBe('lax');
});
test('existing real guests keep their identity without duplicate credit initialization', async () => {
  cookieId = guest.id;
  expect(await getCurrentUser()).toEqual(guest);
  expect(await getOrCreateUser(true)).toEqual(guest);
  expect(creations).toBe(0);
  expect(initialized).toEqual([]);
});
test('a real authenticated session takes precedence over a guest cookie', async () => {
  cookieId = guest.id;
  session = { user: { id: registered.id } };
  expect(await getCurrentUser()).toEqual(registered);
  expect(await getOrCreateUser(true)).toEqual(registered);
  expect(creations).toBe(0);
});
test('missing identities do not authorize reads but can initialize a new guest deliberately', async () => {
  cookieId = 'missing';
  expect(await getCurrentUser()).toBeNull();
  expect(await getOrCreateUser(true)).toEqual({ id: 'new-guest', isGuest: true });
  expect(initialized).toEqual(['new-guest']);
});

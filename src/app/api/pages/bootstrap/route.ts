import { NextResponse } from 'next/server';
import { auth, getOrCreateUser } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { setAllNotebooks } from '@/lib/redis-utils';
import { mayBootstrapNotebooks, serializeNotebookCards } from '../../../../../cloudflare/contracts.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Match the existing root page, while persisting its guest identity through an HttpOnly cookie.
    const user = await getOrCreateUser(true);
    const session = await auth.api.getSession({ headers: await headers() });
    // A client-supplied guest cookie must never grant a registered user's identity.
    if (!user || !mayBootstrapNotebooks(session, user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    const notebooks = await prisma.notebook.findMany({
      where: { OR: [{ userId: user.id }, { bookmarkedBy: { some: { id: user.id } } }, { sharedWith: { some: { id: user.id } } }] },
      include: { sources: true, user: { select: { name: true } }, sharedWith: { select: { id: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const cards = serializeNotebookCards(notebooks, user.id);
    await setAllNotebooks(user.id, cards);
    return NextResponse.json({ notebooks: cards }, { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
  } catch {
    return NextResponse.json({ error: 'Could not load notebooks' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

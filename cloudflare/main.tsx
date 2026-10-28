import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { RootLayout } from '@/components/root-layout';
import HomePage from '@/app/home-page';
import PrivacyPage from '@/app/privacy/page';
import NotebookPage from './notebook';
import { resolveRoute } from './contracts.mjs';
import { useSession } from '@/lib/auth-client';
import '@/app/globals.css';
import './fonts.css';

function Home({ refresh }: { refresh: number }) {
  const { data: session, isPending } = useSession();
  const [notebooks, setNotebooks] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isPending) return;
    const abort = new AbortController();
    setNotebooks(null);
    setError('');
    fetch('/api/pages/bootstrap', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in to view your notebooks.' : 'Could not load notebooks. Please retry.');
        const data = await response.json();
        if (abort.signal.aborted) return;
        if (!Array.isArray(data.notebooks)) throw new Error('Unexpected notebook response');
        setNotebooks(data.notebooks);
      }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, [refresh, session?.user?.id, isPending]);
  if (error) return <div role="alert" className="p-8">{error}<button className="ml-4 underline" onClick={() => window.dispatchEvent(new Event('pages:refresh'))}>Retry</button></div>;
  if (!notebooks) return <p role="status" className="p-8">Loading notebooks…</p>;
  return <HomePage key={refresh} notebooks={notebooks} />;
}

function App() {
  const { data: session, isPending } = useSession();
  const [pathname, setPathname] = useState(window.location.pathname);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const route = () => setPathname(window.location.pathname);
    const reload = () => setRefresh(value => value + 1);
    window.addEventListener('popstate', route);
    window.addEventListener('pages:refresh', reload);
    return () => { window.removeEventListener('popstate', route); window.removeEventListener('pages:refresh', reload); };
  }, []);
  const route = resolveRoute(pathname);
  const identity = session?.user?.id || 'guest';
  let content;
  if (route.kind === 'home') {
    content = isPending ? <p role="status" className="p-8">Loading session…</p> : <Home key={`home:${identity}`} refresh={refresh} />;
  } else if (route.kind === 'notebook') {
    content = isPending ? <p role="status" className="p-8">Loading session…</p> : <NotebookPage key={`${route.id}:${refresh}:${identity}`} notebookId={route.id} />;
  } else if (route.kind === 'privacy') {
    content = <PrivacyPage />;
  } else {
    content = <div className="p-8"><h1>Page not found</h1><a href="/">Return to notebooks</a></div>;
  }
  return <RootLayout>{content}<Toaster richColors /></RootLayout>;
}

createRoot(document.getElementById('root')!).render(<App />);

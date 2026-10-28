export function navigate(href: string, replace = false, scroll = true) {
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin) { window.location.assign(target); return; }
  window.history[replace ? 'replaceState' : 'pushState']({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (scroll) window.scrollTo(0, 0);
}
export function useRouter() {
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, true),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.dispatchEvent(new Event('pages:refresh')),
    prefetch: () => Promise.resolve(),
  };
}

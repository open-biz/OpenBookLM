import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { navigate } from './navigation';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};
export default forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch, replace, scroll, onClick, ...props }, ref) {
  const url = typeof href === 'string' ? href : `${href.pathname || '/'}${href.query ? `?${new URLSearchParams(href.query)}` : ''}`;
  function click(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || props.download) return;
    const next = new URL(url, window.location.href);
    if (next.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(next.pathname + next.search + next.hash, replace, scroll);
  }
  return <a {...props} ref={ref} href={url} onClick={click} />;
});

import { useEffect, useState } from 'react';

/** Hash routes work on GitHub Pages with no server rewrites, including on a page refresh. */
function current(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function useRoute(): string {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

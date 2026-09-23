import { useEffect, useState } from 'react';

export function navigate(path, { replace = false } = {}) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return path;
}

export function AppLink({ to, className = '', children }) {
  const path = usePathname();
  const active = path === to;
  return <a href={to} className={`${className}${active ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); navigate(to); }}>{children}</a>;
}

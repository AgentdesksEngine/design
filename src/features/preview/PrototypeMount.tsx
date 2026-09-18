import { useEffect, useRef, useState } from 'react';
import { rewritePrototypeDocument } from '@/lib/prototype';

export function PrototypeMount({ entryPath, className = '' }: { entryPath: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    setLoading(true);
    setError(null);
    host.replaceChildren();
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.replaceChildren();

    void fetch(entryPath)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Prototype returned ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        const parsed = rewritePrototypeDocument(html, entryPath);
        const reset = document.createElement('style');
        reset.textContent = ':host{display:block;width:100%;height:100%;background:white}.prototype-root{min-height:100%;}';
        shadow.append(reset);
        for (const node of parsed.styles) shadow.append(node.cloneNode(true));
        const root = document.createElement('div');
        root.className = 'prototype-root';
        for (const node of parsed.bodyNodes) root.append(node.cloneNode(true));
        shadow.append(root);
        for (const original of parsed.scripts) {
          const script = document.createElement('script');
          for (const attr of original.attributes) script.setAttribute(attr.name, attr.value);
          script.textContent = original.textContent;
          shadow.append(script);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load prototype');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      shadow.replaceChildren();
    };
  }, [entryPath]);

  return (
    <div className={`prototype-host ${className}`}>
      {loading && <div className="prototype-state">Loading prototype...</div>}
      {error && <div className="prototype-state error">{error}</div>}
      <div ref={hostRef} className="prototype-shadow-host" />
    </div>
  );
}

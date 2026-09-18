import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LogOut, CheckCircle2 } from 'lucide-react';
import type { DesignStatus } from '@shared/types';
import { useAuth, useDesigns } from '@/api/hooks';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { STATUS_OPTIONS, statusLabel } from '@/lib/status';

export function GalleryPage() {
  const { data: auth } = useAuth();
  const { data, isPending, isError } = useDesigns(Boolean(auth?.user));
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DesignStatus | 'ALL'>('ALL');

  const designs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((design) => {
      const matchesQuery =
        !q ||
        design.title.toLowerCase().includes(q) ||
        design.description.toLowerCase().includes(q) ||
        design.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = status === 'ALL' || design.status.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [data, query, status]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          <a className="active">Designs</a>
          <a>Released</a>
          <a>Archived</a>
        </nav>
        <div className="sidebar-footer">
          <span>{auth?.user?.email}</span>
          <Button variant="ghost" onClick={() => (window.location.href = '/api/auth/logout')}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>
      <main className="gallery-main">
        <header className="gallery-header">
          <div>
            <h1>Design Gallery</h1>
            <p>Committed HTML prototypes, versioned and tracked for release readiness.</p>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs" />
          </div>
        </header>
        <div className="status-tabs">
          <button className={status === 'ALL' ? 'selected' : ''} onClick={() => setStatus('ALL')}>All</button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={status === option.value ? 'selected' : ''}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isPending && <div className="empty-state">Loading designs...</div>}
        {isError && <div className="empty-state">Could not load designs.</div>}
        {!isPending && !isError && (
          <section className="design-grid">
            {designs.map((design) => (
              <Link className="design-card" key={design.slug} to={`/design/${design.slug}/${design.defaultVersion}`}>
                <img src={design.thumbnailPath} alt="" />
                <div className="card-body">
                  <div className="card-title-row">
                    <h2>{design.title}</h2>
                    {design.status.releasedToProd && <CheckCircle2 className="released-icon" size={17} />}
                  </div>
                  <p>{design.description}</p>
                  <div className="card-meta">
                    <span>{design.latestVersion}</span>
                    <span className={`status-pill status-${design.status.status.toLowerCase()}`}>
                      {statusLabel(design.status.status)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

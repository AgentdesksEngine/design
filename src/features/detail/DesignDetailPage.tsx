import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { DesignStatus } from '@shared/types';
import { useDesign, useUpdateDesignStatus } from '@/api/hooks';
import { Button } from '@/components/ui/Button';
import { PrototypeMount } from '@/features/preview/PrototypeMount';
import { STATUS_OPTIONS, statusLabel } from '@/lib/status';

export function DesignDetailPage() {
  const { slug, version } = useParams();
  const navigate = useNavigate();
  const { data: design, isPending, isError } = useDesign(slug);
  const selectedVersion = useMemo(() => {
    if (!design) return undefined;
    return design.versions.find((v) => v.version === version) ?? design.versions.find((v) => v.version === design.defaultVersion) ?? design.versions[0];
  }, [design, version]);

  useEffect(() => {
    if (design && selectedVersion && version !== selectedVersion.version) {
      navigate(`/design/${design.slug}/${selectedVersion.version}`, { replace: true });
    }
  }, [design, navigate, selectedVersion, version]);

  if (isPending) return <div className="state-page"><span className="spinner" /></div>;
  if (isError || !design || !selectedVersion) return <div className="empty-state">Design not found.</div>;

  return (
    <div className="detail-layout">
      <main className="detail-main">
        <div className="detail-toolbar">
          <Link className="back-link" to="/"><ArrowLeft size={17} /> Designs</Link>
          <div className="version-tabs">
            {design.versions.map((v) => (
              <Link key={v.version} className={v.version === selectedVersion.version ? 'active' : ''} to={`/design/${design.slug}/${v.version}`}>
                {v.version}
              </Link>
            ))}
          </div>
          <Link className="button button-primary" to={`/preview/${design.slug}/${selectedVersion.version}`} target="_blank">
            <ExternalLink size={16} /> Open prototype
          </Link>
        </div>
        <div className="detail-heading">
          <div>
            <h1>{design.title}</h1>
            <p>{design.description}</p>
          </div>
          <span className={`status-pill status-${design.status.status.toLowerCase()}`}>
            {statusLabel(design.status.status)}
          </span>
        </div>
        <section className="preview-frame">
          <PrototypeMount entryPath={selectedVersion.entryPath} />
        </section>
      </main>
      <aside className="inspector">
        <h2>Metadata</h2>
        <dl>
          <dt>Owner</dt><dd>{design.owner ?? 'Unassigned'}</dd>
          <dt>Latest</dt><dd>{design.latestVersion}</dd>
          <dt>Tags</dt><dd>{design.tags.join(', ') || 'None'}</dd>
        </dl>
        <StatusEditor slug={design.slug} title="Design status" status={design.status} />
        <StatusEditor slug={design.slug} version={selectedVersion.version} title={`${selectedVersion.version} status`} status={selectedVersion.status} />
        <section className="notes-block">
          <h2>{selectedVersion.title}</h2>
          <p>{selectedVersion.notes || 'No version notes yet.'}</p>
        </section>
      </aside>
    </div>
  );
}

function StatusEditor({
  slug,
  version,
  title,
  status,
}: {
  slug: string;
  version?: string;
  title: string;
  status: { status: DesignStatus; releasedToProd: boolean; releasedAt: string | null; notes: string };
}) {
  const mutation = useUpdateDesignStatus(slug, version);
  const [draftStatus, setDraftStatus] = useState<DesignStatus>(status.status);
  const [released, setReleased] = useState(status.releasedToProd);
  const [notes, setNotes] = useState(status.notes);

  useEffect(() => {
    setDraftStatus(status.status);
    setReleased(status.releasedToProd);
    setNotes(status.notes);
  }, [status.notes, status.releasedToProd, status.status]);

  return (
    <section className="status-editor">
      <h2>{title}</h2>
      <label>
        Status
        <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as DesignStatus)}>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={released} onChange={(e) => setReleased(e.target.checked)} />
        Released to prod
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
      <Button
        variant="primary"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            status: draftStatus,
            releasedToProd: released,
            releasedAt: released ? new Date().toISOString() : null,
            notes,
          })
        }
      >
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
      {mutation.isError && <p className="error">Could not save status.</p>}
    </section>
  );
}

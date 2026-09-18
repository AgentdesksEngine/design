import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDesign } from '@/api/hooks';
import { PrototypeMount } from './PrototypeMount';

export function PreviewPage() {
  const { slug, version } = useParams();
  const { data, isPending, isError } = useDesign(slug);
  const selected = data?.versions.find((v) => v.version === version);

  if (isPending) return <div className="state-page"><span className="spinner" /></div>;
  if (isError || !data || !selected) return <div className="empty-state">Prototype not found.</div>;

  return (
    <div className="full-preview">
      <div className="preview-topbar">
        <Link className="back-link" to={`/design/${data.slug}/${selected.version}`}><ArrowLeft size={17} /> {data.title}</Link>
        <span>{selected.version}</span>
      </div>
      <PrototypeMount entryPath={selected.entryPath} className="prototype-full" />
    </div>
  );
}

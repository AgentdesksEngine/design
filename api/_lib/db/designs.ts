import type {
  DesignDetail,
  DesignManifest,
  DesignStatus,
  DesignStatusInfo,
  DesignSummary,
  DesignVersion,
  SessionUser,
  UpdateStatusRequest,
} from '../../../shared/types.js';
import { catalog } from '../../../shared/catalog.generated.js';
import { HttpError } from '../http.js';
import { db } from './pool.js';

const STATUSES = new Set<DesignStatus>(['DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED', 'ARCHIVED']);

interface StatusRow {
  design_slug: string;
  version_slug: string;
  status: DesignStatus;
  released_to_prod: boolean;
  released_at: string | null;
  status_notes: string | null;
  updated_at: string;
  updater_id: string | null;
  updater_email: string | null;
  updater_name: string | null;
  updater_avatar_url: string | null;
}

function defaultStatus(): DesignStatusInfo {
  return {
    status: 'DRAFT',
    releasedToProd: false,
    releasedAt: null,
    notes: '',
    updatedAt: null,
    updatedBy: null,
  };
}

function toStatus(row?: StatusRow): DesignStatusInfo {
  if (!row) return defaultStatus();
  const updatedBy: SessionUser | null = row.updater_id
    ? {
        id: row.updater_id,
        email: row.updater_email ?? '',
        name: row.updater_name,
        avatarUrl: row.updater_avatar_url,
      }
    : null;
  return {
    status: row.status,
    releasedToProd: row.released_to_prod,
    releasedAt: row.released_at,
    notes: row.status_notes ?? '',
    updatedAt: row.updated_at,
    updatedBy,
  };
}

function latestVersion(manifest: DesignManifest) {
  return manifest.versions[manifest.versions.length - 1]!.version;
}

function publicPath(manifest: DesignManifest, relative: string) {
  return `/prototypes/${manifest.slug}/${relative}`;
}

function buildDesign(manifest: DesignManifest, statusRows: Map<string, StatusRow>): DesignSummary {
  const versions: DesignVersion[] = manifest.versions.map((v) => ({
    version: v.version,
    title: v.title ?? v.version,
    notes: v.notes ?? '',
    entryPath: publicPath(manifest, v.entry),
    thumbnailPath: publicPath(manifest, v.thumbnail),
    createdAt: v.createdAt ?? null,
    status: toStatus(statusRows.get(`${manifest.slug}:${v.version}`)),
  }));
  const defaultVersion = manifest.defaultVersion ?? latestVersion(manifest);
  const thumbnail = versions.find((v) => v.version === defaultVersion)?.thumbnailPath ?? versions[0]!.thumbnailPath;
  return {
    slug: manifest.slug,
    title: manifest.title,
    description: manifest.description,
    tags: manifest.tags,
    owner: manifest.owner ?? null,
    defaultVersion,
    latestVersion: latestVersion(manifest),
    thumbnailPath: thumbnail,
    status: toStatus(statusRows.get(`${manifest.slug}:`)),
    versions,
  };
}

export function findManifest(slug: string): DesignManifest {
  const manifest = catalog.find((d) => d.slug === slug);
  if (!manifest) throw new HttpError(404, 'Design not found');
  return manifest;
}

export function findVersion(manifest: DesignManifest, version: string) {
  const item = manifest.versions.find((v) => v.version === version);
  if (!item) throw new HttpError(404, 'Design version not found');
  return item;
}

async function loadStatusRows(slugs: string[]) {
  if (!slugs.length) return new Map<string, StatusRow>();
  const sql = db();
  const rows = await sql<StatusRow[]>`
    select
      ds.design_slug,
      ds.version_slug,
      ds.status,
      ds.released_to_prod,
      ds.released_at,
      ds.status_notes,
      ds.updated_at,
      p.id as updater_id,
      p.email as updater_email,
      p.display_name as updater_name,
      p.avatar_url as updater_avatar_url
    from design_status ds
    left join profiles p on p.id = ds.updated_by
    where ds.design_slug = any(${slugs})
  `;
  return new Map(rows.map((row) => [`${row.design_slug}:${row.version_slug}`, row]));
}

export async function listDesigns(): Promise<DesignSummary[]> {
  const statuses = await loadStatusRows(catalog.map((d) => d.slug));
  return catalog.map((manifest) => buildDesign(manifest, statuses));
}

export async function getDesign(slug: string): Promise<DesignDetail> {
  const manifest = findManifest(slug);
  const statuses = await loadStatusRows([slug]);
  return buildDesign(manifest, statuses);
}

export function parseStatusBody(body: unknown): UpdateStatusRequest {
  const b = (body ?? {}) as Partial<UpdateStatusRequest>;
  if (!STATUSES.has(b.status as DesignStatus)) throw new HttpError(400, 'Invalid status');
  return {
    status: b.status as DesignStatus,
    releasedToProd: Boolean(b.releasedToProd),
    releasedAt: b.releasedAt ?? null,
    notes: b.notes ?? '',
  };
}

export async function updateStatus(
  manifest: DesignManifest,
  versionSlug: string,
  body: UpdateStatusRequest,
  profileId: string,
): Promise<DesignStatusInfo> {
  const sql = db();
  const latest = latestVersion(manifest);
  const defaultVersion = manifest.defaultVersion ?? latest;
  const thumbnail = manifest.versions.find((v) => v.version === defaultVersion)!.thumbnail;
  await sql.begin(async (tx) => {
    await tx`
      insert into designs (slug, title, description, tags, owner_name, default_version, latest_version, thumbnail_path)
      values (${manifest.slug}, ${manifest.title}, ${manifest.description}, ${manifest.tags}, ${manifest.owner ?? null}, ${defaultVersion}, ${latest}, ${publicPath(manifest, thumbnail)})
      on conflict (slug) do update set
        title = excluded.title,
        description = excluded.description,
        tags = excluded.tags,
        owner_name = excluded.owner_name,
        default_version = excluded.default_version,
        latest_version = excluded.latest_version,
        thumbnail_path = excluded.thumbnail_path,
        updated_at = now()
    `;
    for (const version of manifest.versions) {
      await tx`
        insert into design_versions (design_slug, version_slug, title, notes, entry_path, thumbnail_path, created_at)
        values (${manifest.slug}, ${version.version}, ${version.title ?? version.version}, ${version.notes ?? ''}, ${publicPath(manifest, version.entry)}, ${publicPath(manifest, version.thumbnail)}, ${version.createdAt ?? null})
        on conflict (design_slug, version_slug) do update set
          title = excluded.title,
          notes = excluded.notes,
          entry_path = excluded.entry_path,
          thumbnail_path = excluded.thumbnail_path
      `;
    }
    await tx`
      insert into design_status (design_slug, version_slug, status, released_to_prod, released_at, status_notes, updated_by, updated_at)
      values (${manifest.slug}, ${versionSlug}, ${body.status}, ${body.releasedToProd}, ${body.releasedAt ?? null}, ${body.notes ?? ''}, ${profileId}, now())
      on conflict (design_slug, version_slug) do update set
        status = excluded.status,
        released_to_prod = excluded.released_to_prod,
        released_at = excluded.released_at,
        status_notes = excluded.status_notes,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;
  });
  const statuses = await loadStatusRows([manifest.slug]);
  return toStatus(statuses.get(`${manifest.slug}:${versionSlug}`));
}

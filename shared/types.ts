export type DesignStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RELEASED' | 'ARCHIVED';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthStatus {
  user: SessionUser | null;
  authConfigured: boolean;
  devLoginAvailable: boolean;
  deniedEmail?: string;
}

export interface DesignVersionManifest {
  version: string;
  title?: string;
  notes?: string;
  entry: string;
  thumbnail: string;
  createdAt?: string;
}

export interface DesignManifest {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  owner?: string;
  defaultVersion?: string;
  versions: DesignVersionManifest[];
}

export interface DesignStatusInfo {
  status: DesignStatus;
  releasedToProd: boolean;
  releasedAt: string | null;
  notes: string;
  updatedAt: string | null;
  updatedBy: SessionUser | null;
}

export interface DesignVersion {
  id?: string;
  version: string;
  title: string;
  notes: string;
  entryPath: string;
  thumbnailPath: string;
  createdAt: string | null;
  status: DesignStatusInfo;
}

export interface DesignSummary {
  id?: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  owner: string | null;
  defaultVersion: string;
  latestVersion: string;
  thumbnailPath: string;
  status: DesignStatusInfo;
  versions: DesignVersion[];
  updatedAt?: string | null;
}

export interface DesignDetail extends DesignSummary {
  versions: DesignVersion[];
}

export interface UpdateStatusRequest {
  status: DesignStatus;
  releasedToProd: boolean;
  releasedAt?: string | null;
  notes?: string;
}

export interface UpdateStatusResponse {
  ok: true;
  status: DesignStatusInfo;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthStatus,
  DesignDetail,
  DesignStatusInfo,
  DesignSummary,
  UpdateStatusRequest,
  UpdateStatusResponse,
} from '@shared/types';
import { get, patch } from './client';

export const keys = {
  auth: ['auth'] as const,
  designs: ['designs'] as const,
  design: (slug: string) => ['design', slug] as const,
};

export function useAuth() {
  return useQuery({
    queryKey: keys.auth,
    queryFn: () => get<AuthStatus>('/api/auth/me'),
    staleTime: 5 * 60_000,
  });
}

export function useDesigns(enabled = true) {
  return useQuery({
    queryKey: keys.designs,
    queryFn: () => get<DesignSummary[]>('/api/designs'),
    staleTime: 30_000,
    enabled,
  });
}

export function useDesign(slug: string | undefined) {
  return useQuery({
    queryKey: keys.design(slug ?? ''),
    queryFn: () => get<DesignDetail>(`/api/designs/${encodeURIComponent(slug!)}`),
    enabled: Boolean(slug),
  });
}

function replaceStatus(
  design: DesignDetail | undefined,
  version: string | undefined,
  status: DesignStatusInfo,
): DesignDetail | undefined {
  if (!design) return design;
  if (!version) return { ...design, status };
  return {
    ...design,
    versions: design.versions.map((v) => (v.version === version ? { ...v, status } : v)),
  };
}

export function useUpdateDesignStatus(slug: string, version?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateStatusRequest) => {
      const path = version
        ? `/api/designs/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/status`
        : `/api/designs/${encodeURIComponent(slug)}/status`;
      return patch<UpdateStatusResponse>(path, body);
    },
    onSuccess: ({ status }) => {
      qc.setQueryData<DesignDetail>(keys.design(slug), (d) => replaceStatus(d, version, status));
      void qc.invalidateQueries({ queryKey: keys.designs });
    },
  });
}

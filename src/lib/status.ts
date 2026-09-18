import type { DesignStatus } from '@shared/types';

export const STATUS_OPTIONS: { value: DesignStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function statusLabel(status: DesignStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

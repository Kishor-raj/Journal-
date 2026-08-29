export const MANUSCRIPT_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'revision_requested',
  'resubmitted',
  'accepted',
  'published',
  'rejected',
  'desk_rejected',
  'withdrawn',
];

export const EDITORIAL_DECISIONS = [
  'pending',
  'major_revision',
  'minor_revision',
  'accepted',
  'rejected',
  'desk_reject',
  'withdrawn',
];

export const REVIEW_RECOMMENDATIONS = [
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
  'invitation_to_revise',
];

export const ASSIGNMENT_STATUSES = [
  'invited',
  'pending',
  'accepted',
  'declined',
  'completed',
  'expired',
];

export const STATUS_COLORS = {
  rejected: { bg: '#FDEDEC', text: '#C0392B', border: '#C0392B' },
  desk_rejected: { bg: '#FDEDEC', text: '#C0392B', border: '#C0392B' },
  desk_reject: { bg: '#FDEDEC', text: '#C0392B', border: '#C0392B' },
  reject: { bg: '#FDEDEC', text: '#C0392B', border: '#C0392B' },
  declined: { bg: '#FDEDEC', text: '#C0392B', border: '#C0392B' },

  accepted: { bg: '#EAF7F0', text: '#1A7F4B', border: '#1A7F4B' },
  published: { bg: '#EAF7F0', text: '#1A7F4B', border: '#1A7F4B' },
  accept: { bg: '#EAF7F0', text: '#1A7F4B', border: '#1A7F4B' },
  completed: { bg: '#EAF7F0', text: '#1A7F4B', border: '#1A7F4B' },

  under_review: { bg: '#FEF3C7', text: '#B45309', border: '#B45309' },

  revision_requested: { bg: '#F3E8FF', text: '#7C3AED', border: '#7C3AED' },
  major_revision: { bg: '#F3E8FF', text: '#7C3AED', border: '#7C3AED' },
  minor_revision: { bg: '#F3E8FF', text: '#7C3AED', border: '#7C3AED' },
  invitation_to_revise: { bg: '#F3E8FF', text: '#7C3AED', border: '#7C3AED' },

  pending: { bg: '#FFF7ED', text: '#C2410C', border: '#C2410C' },
  invited: { bg: '#FFF7ED', text: '#C2410C', border: '#C2410C' },

  draft: { bg: '#F1F5F9', text: '#64748B', border: '#C9C2B4' },
  withdrawn: { bg: '#F1F5F9', text: '#64748B', border: '#C9C2B4' },
  expired: { bg: '#F1F5F9', text: '#64748B', border: '#C9C2B4' },

  submitted: { bg: '#E3EEF9', text: '#1565C0', border: '#1565C0' },
  resubmitted: { bg: '#E3EEF9', text: '#1565C0', border: '#1565C0' },
};

export const DEFAULT_STATUS_COLOR = { bg: '#F1F5F9', text: '#64748B', border: '#C9C2B4' };

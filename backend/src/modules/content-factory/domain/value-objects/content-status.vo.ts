import { ContentStatus } from '@prisma-client/content-factory';

// State machine transitions for content lifecycle
export const CONTENT_STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.RAW]: [ContentStatus.AI_PROCESSING, ContentStatus.FAILED],
  [ContentStatus.AI_PROCESSING]: [ContentStatus.GENERATED, ContentStatus.FAILED],
  [ContentStatus.GENERATED]: [ContentStatus.PENDING_APPROVAL, ContentStatus.FAILED],
  [ContentStatus.PENDING_APPROVAL]: [ContentStatus.PUBLISHING, ContentStatus.SCHEDULED, ContentStatus.GENERATED],
  [ContentStatus.SCHEDULED]: [ContentStatus.PUBLISHING, ContentStatus.FAILED],
  [ContentStatus.PUBLISHING]: [ContentStatus.PUBLISHED, ContentStatus.FAILED],
  [ContentStatus.PUBLISHED]: [],
  [ContentStatus.FAILED]: [ContentStatus.RAW],
};

export function canTransitionContentStatus(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalStatus(status: ContentStatus): boolean {
  return CONTENT_STATUS_TRANSITIONS[status].length === 0;
}

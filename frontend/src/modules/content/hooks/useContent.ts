import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentService } from '../services/content.service';
import type { Platform, ContentStatus, ContentType } from '@core/api/api.types';

const CONTENT_KEY = 'content';

export function useContent(params: { platform?: Platform; status?: ContentStatus; page?: number } = {}) {
  return useQuery({
    queryKey: [CONTENT_KEY, params],
    queryFn: () => contentService.getMany(params),
  });
}

export function useUpdateContentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      contentService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONTENT_KEY] }),
  });
}

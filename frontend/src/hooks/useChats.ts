'use client';

import { useQuery } from '@tanstack/react-query';
import { chatsService } from '@/services/chats.service';

export const chatKeys = {
  all: ['chats'] as const,
  list: (status?: string) => ['chats', 'list', status || 'all'] as const,
};

export function useChats(status?: string) {
  return useQuery({
    queryKey: chatKeys.list(status),
    queryFn: () => chatsService.list(status ? { status } : undefined),
  });
}

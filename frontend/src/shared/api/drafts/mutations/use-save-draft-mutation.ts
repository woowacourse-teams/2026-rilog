'use client';

import { useMutation } from '@tanstack/react-query';

import { saveDraft } from '@/shared/api/drafts/api';

export const useSaveDraftMutation = () => useMutation({ mutationFn: saveDraft });

'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/components/toast';

export const OAuthErrorHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get('error');

    if (error === 'social_signin_failed') {
      toast({
        type: 'error',
        description: 'Social authentication failed. Please try again.',
      });

      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      router.replace(url.pathname + url.search);
    }
  }, [searchParams, router]);

  return null;
};

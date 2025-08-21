'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? theme : 'system') as Theme;
  const currentResolvedTheme = (mounted ? resolvedTheme : 'light') as
    | 'light'
    | 'dark';

  return {
    theme: currentTheme,
    resolvedTheme: currentResolvedTheme,
    setTheme,
    mounted,
  };
};

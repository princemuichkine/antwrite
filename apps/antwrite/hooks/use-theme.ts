'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const { theme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? theme : 'system') as Theme;

  return {
    theme: currentTheme,
    setTheme,
  };
};

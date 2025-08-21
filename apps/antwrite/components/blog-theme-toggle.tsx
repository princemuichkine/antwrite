'use client';

import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';

export function BlogThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [hoveredTheme, setHoveredTheme] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      onMouseEnter={() => setHoveredTheme(true)}
      onMouseLeave={() => setHoveredTheme(false)}
      className="fixed top-4 left-4 z-50 size-10 rounded-sm hover:bg-sidebar-accent transition-colors duration-200 inline-flex items-center justify-center"
      title={`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
      data-theme-toggle
    >
      <LottieIcon
        animationData={theme === 'dark' ? animations.sun : animations.point}
        size={19}
        loop={false}
        autoplay={false}
        initialFrame={0}
        isHovered={hoveredTheme}
      />
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';
import { WelcomeModal } from '@/components/welcome-modal';

export function GuestSidebarFooter() {
  const { setTheme, theme } = useTheme();
  const [hoveredTheme, setHoveredTheme] = useState(false);
  const [hoveredWelcome, setHoveredWelcome] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <div className="px-2 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          onMouseEnter={() => setHoveredTheme(true)}
          onMouseLeave={() => setHoveredTheme(false)}
          className="size-10 rounded-sm hover:bg-sidebar-accent transition-colors duration-200 inline-flex items-center justify-center"
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

        <button
          type="button"
          onClick={() => setShowWelcomeModal(true)}
          onMouseEnter={() => setHoveredWelcome(true)}
          onMouseLeave={() => setHoveredWelcome(false)}
          className="size-10 rounded-sm hover:bg-sidebar-accent transition-colors duration-200 inline-flex items-center justify-center"
          title="Learn about Antwrite"
          data-welcome-toggle
        >
          <LottieIcon
            animationData={animations.info}
            size={19}
            loop={false}
            autoplay={false}
            initialFrame={0}
            isHovered={hoveredWelcome}
          />
        </button>
      </div>

      <WelcomeModal
        open={showWelcomeModal}
        onOpenChange={setShowWelcomeModal}
      />
    </>
  );
}

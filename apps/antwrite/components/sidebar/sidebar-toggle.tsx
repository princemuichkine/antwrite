import type { ComponentProps } from 'react';
import { useState } from 'react';

import { type SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';
import { Button } from '../ui/button';

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();
  const [hoveredSidebar, setHoveredSidebar] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleSidebar}
          variant="outline"
          className="md:px-2 md:h-fit"
          onMouseEnter={() => setHoveredSidebar(true)}
          onMouseLeave={() => setHoveredSidebar(false)}
        >
          <LottieIcon
            animationData={animations.sidepanel}
            size={19}
            loop={false}
            autoplay={false}
            initialFrame={0}
            isHovered={hoveredSidebar}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}

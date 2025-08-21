import { useState, useRef, useEffect, memo, useMemo } from 'react';
import Lottie from 'lottie-react';
import { useTheme } from '@/hooks/use-theme';
import type { LottieAnimationData } from '@/lib/utils/lottie-animations';

interface LottieIconProps {
  animationData: string | object;
  size?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  initialFrame?: number; // Frame to show initially for better static visibility
  isHovered?: boolean; // External hover control
  customColor?: [number, number, number]; // RGB values as decimals (0-1)
}

const LottieIconComponent = ({
  animationData,
  size = 20, // Increased from 18 for bolder appearance
  className = '',
  loop = false,
  autoplay = false,
  initialFrame,
  isHovered: externalHovered,
  customColor,
}: LottieIconProps): JSX.Element => {
  const [internalHovered, setInternalHovered] = useState(false);
  const [animData, setAnimData] = useState<LottieAnimationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = useRef<any>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const color = useMemo(() => {
    if (customColor) return customColor;
    // Default to current text color - using pure white/black for maximum contrast
    return isDark
      ? ([1, 1, 1] as [number, number, number]) // Pure white in dark mode
      : ([0, 0, 0] as [number, number, number]); // Pure black in light mode
  }, [isDark, customColor]);

  // Use external hover state if provided, otherwise use internal state
  const isHovered =
    externalHovered !== undefined ? externalHovered : internalHovered;

  useEffect(() => {
    // Handle direct object data (our new preferred approach)
    if (typeof animationData === 'object' && animationData !== null) {
      let processedData = animationData as LottieAnimationData;

      // If color is provided, override the primary color in the control layer
      if (color && processedData.layers) {
        processedData = JSON.parse(JSON.stringify(processedData)); // Deep clone
        const controlLayer = processedData.layers.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (layer: any) => layer.nm === 'control' && layer.ef,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
        if (controlLayer?.ef) {
          const primaryEffect = controlLayer.ef.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (effect: any) => effect.nm === 'primary',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any;
          if (primaryEffect?.ef) {
            const colorControl = primaryEffect.ef.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (control: any) => control.nm === 'Color',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
            if (colorControl?.v?.k) {
              colorControl.v.k = [...color, 1]; // Add alpha channel
            }
          }
        }
      }

      setAnimData(processedData);
      setIsLoading(false);
      return;
    }

    // Handle string paths (legacy - should warn developers)
    if (typeof animationData === 'string') {
      console.warn(
        `Using path string "${animationData}" for Lottie animation is deprecated. Please use direct animation imports from @/lib/utils/lottie-animations instead.`,
      );
      setAnimData(null);
      setIsLoading(false);
    }
  }, [animationData, color]);

  // Set initial frame when animation loads
  useEffect(() => {
    if (lottieRef.current && animData && initialFrame !== undefined) {
      lottieRef.current.goToAndStop(initialFrame, true);
    }
  }, [animData, initialFrame]);

  // Handle animation based on hover state
  useEffect(() => {
    if (lottieRef.current && animData) {
      if (isHovered) {
        lottieRef.current.play();
      } else if (!loop) {
        if (initialFrame !== undefined) {
          lottieRef.current.goToAndStop(initialFrame, true);
        } else {
          lottieRef.current.stop();
        }
      }
    }
  }, [isHovered, animData, initialFrame, loop]);

  const handleMouseEnter = () => {
    if (externalHovered === undefined) {
      setInternalHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (externalHovered === undefined) {
      setInternalHovered(false);
    }
  };

  if (isLoading || !animData) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-sm animate-spin opacity-50" />
        ) : (
          <div className="w-full h-full bg-muted-foreground/20 rounded-sm animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${isHovered ? 'scale-110' : ''
        } ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animData}
        autoplay={autoplay}
        loop={loop}
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const LottieIcon = memo(LottieIconComponent);

// Set displayName for proper component identification
LottieIcon.displayName = 'LottieIcon';

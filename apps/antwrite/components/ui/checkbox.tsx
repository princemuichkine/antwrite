'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-3.5 w-3.5 shrink-0 rounded-sm border border-cyan-200 dark:border-cyan-800 bg-transparent ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cyan-50 dark:data-[state=checked]:bg-cyan-900/30 data-[state=checked]:text-cyan-700 dark:data-[state=checked]:text-cyan-300 data-[state=checked]:border-cyan-400 dark:data-[state=checked]:border-cyan-500 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors duration-200',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-2.5 w-2.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };

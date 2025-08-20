'use client';

import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SubmitButtonProps {
  isSuccessful: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SubmitButton({ isSuccessful, children, className }: SubmitButtonProps) {
  const defaultGreenStyle = "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800";

  return (
    <Button type="submit" className={`w-full ${className || defaultGreenStyle}`} disabled={isSuccessful}>
      {isSuccessful ? (
        <>
          <Check className="mr-2 size-4" />
          Done
        </>
      ) : (
        children
      )}
    </Button>
  );
}

'use client';

import { Button } from '@/components/ui/button';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ShareButtonProps {
  url: string;
}

const TRANSITION_CONTENT = {
  ease: 'easeOut',
  duration: 0.2,
};

export function ShareButton({ url }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (status === 'copied') {
      const timer = setTimeout(() => {
        setStatus('idle');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {status === 'copied' ? (
        <motion.div
          key="copied"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={TRANSITION_CONTENT}
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-default"
          >
            Copied
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="share"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={TRANSITION_CONTENT}
        >
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="text-accent-foreground bg-background/30 hover:bg-accent/30 border border-border/30 hover:opacity-100 transition-colors duration-200"
          >
            Share
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/hooks/use-theme';

export const Overview = () => {
  const { resolvedTheme } = useTheme();

  return (
    <motion.div
      key="overview"
      className="size-full flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-sm p-6 flex flex-col gap-4 leading-relaxed text-center max-w-md bg-card/50 border shadow-sm dark:border-white/10">
        <div className="flex justify-center mb-2">
          <Image
            src={
              resolvedTheme === 'dark'
                ? '/brand/logo/antwrite-tw.webp'
                : '/brand/logo/antwrite-tb.webp'
            }
            alt="Antwrite"
            width={120}
            height={40}
            className="object-contain"
          />
        </div>
        <h2 className="text-xl font-medium">Welcome to Antwrite</h2>

        <p className="text-sm text-muted-foreground">
          A modern writing tool designed to enhance your creative process.
          Write, edit, and collaborate with AI.
        </p>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Press{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border border-border rounded-sm">
              TAB
            </kbd>{' '}
            to generate a suggestion.
          </p>
          <p>
            Highlight text and press{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border border-border rounded-sm">
              ⌘/Ctrl + K
            </kbd>{' '}
            to edit.
          </p>
          <p>Send a message in the chat input below.</p>
          <p>
            Hold{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border border-border rounded-sm">
              Shift
            </kbd>{' '}
            and hover over text for synonyms.
          </p>
          <p>Configure AI behavior in the settings menu (top-right).</p>
        </div>
      </div>
    </motion.div>
  );
};

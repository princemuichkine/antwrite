import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/hooks/use-theme';

export const Overview = () => {
  const { resolvedTheme } = useTheme();

  return (
    <motion.div
      key="overview"
      className="size-full flex items-center justify-center p-5"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-sm p-6 flex flex-col gap-4 leading-relaxed text-center max-w-md bg-card/50 border shadow-sm dark:border-white/10">
        <div className="flex justify-center mb-0">
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

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p className="leading-relaxed">
            Press{' '}
            <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold text-primary bg-background border border-border rounded-sm shadow-sm min-w-[30px] justify-center">
              TAB
            </kbd>{' '}
            to generate a suggestion.
          </p>
          <p className="leading-relaxed">
            Highlight text and press{' '}
            <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold text-primary bg-background border border-border rounded-sm shadow-sm min-w-[70px] justify-center">
              ⌘/Ctrl + K
            </kbd>{' '}
            to edit.
          </p>
          <p className="leading-relaxed">Send a message in the chat input below.</p>
          <p className="leading-relaxed">
            Hold{' '}
            <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold text-primary bg-background border border-border rounded-sm shadow-sm min-w-[40px] justify-center">
              Shift
            </kbd>{' '}
            and hover over text for synonyms.
          </p>
          <p className="leading-relaxed">Configure AI behavior in the settings menu (top-right).</p>
        </div>
      </div>
    </motion.div>
  );
};

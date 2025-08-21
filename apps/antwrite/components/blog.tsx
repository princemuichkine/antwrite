'use client';
import React from 'react';
import { Markdown } from '@/components/markdown';
import { googleFonts } from '@/lib/fonts';
import { useTheme } from '@/hooks/use-theme';
import { ShareButton } from '@/components/share-button';

interface BlogProps {
  title: string;
  content: string;
  font?: string;
  accentColor?: string;
  textColorLight?: string;
  textColorDark?: string;
  author?: string;
  date?: string;
}

export const Blog: React.FC<BlogProps> = ({
  title,
  content,
  font = 'montserrat',
  accentColor,
  textColorLight,
  textColorDark,
  author,
  date,
}) => {
  const { resolvedTheme } = useTheme();
  // Pick correct text color based on theme
  const themeTextColor =
    resolvedTheme === 'dark' ? textColorLight : textColorDark;
  const fontClass = (googleFonts as Record<string, any>)[font]?.className || '';

  // Style for main container (accent)
  const mainStyle: React.CSSProperties = {
    ...(accentColor ? ({ '--accent-color': accentColor } as any) : {}),
  };

  // Typography override for text color on prose elements
  const proseStyle: React.CSSProperties = themeTextColor
    ? ({
        '--tw-prose-body': themeTextColor,
        '--tw-prose-headings': themeTextColor,
        '--tw-prose-lead': themeTextColor,
        '--tw-prose-links': themeTextColor,
        '--tw-prose-bold': themeTextColor,
        '--tw-prose-counters': themeTextColor,
        '--tw-prose-bullets': themeTextColor,
        '--tw-prose-captions': themeTextColor,
        '--tw-prose-th-borders': themeTextColor,
        '--tw-prose-td-borders': themeTextColor,
      } as any)
    : {};

  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'short' });

      const getOrdinalSuffix = (d: number) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
          case 1:
            return 'st';
          case 2:
            return 'nd';
          case 3:
            return 'rd';
          default:
            return 'th';
        }
      };
      return `${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  const formattedDate = formatDate(date);

  const metaParts = [];
  if (author) {
    metaParts.push(
      <span key="author">
        By <strong>{author}</strong>
      </span>,
    );
  }
  if (formattedDate) {
    metaParts.push(<span key="date">{formattedDate}</span>);
  }
  metaParts.push(<span key="reading-time">{`${readingTime} min read`}</span>);

  const postUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : 'https://antwrite.com';

  return (
    <>
      <main className="min-h-screen bg-background" style={mainStyle}>
        <article
          className={`prose dark:prose-invert mx-auto py-16 px-4 sm:px-6 lg:px-8 ${fontClass} break-words hyphens-auto`}
          // className={`prose dark:prose-invert mx-auto py-16 px-4 sm:px-6 lg:px-8 ${fontClass} break-words hyphens-auto text-justify`}
          style={{ ...proseStyle, maxWidth: 'calc(65ch + 45px)' }}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-8">
            {title}
          </h1>
          {(author || date) && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {metaParts.map((part, index) => (
                    <React.Fragment key={part.key || `meta-part-${index}`}>
                      {part}
                      {index < metaParts.length - 1 && (
                        <span className="text-muted-foreground/50">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <ShareButton url={postUrl} />
              </div>
              <hr className="mb-6 mt-4 border-border/50" />
            </>
          )}
          <Markdown>{content}</Markdown>
        </article>
      </main>
    </>
  );
};

import type { ReactNode } from 'react';
import { db } from '@antwrite/db';
import * as schema from '@antwrite/db';
import { eq, and } from 'drizzle-orm';

export async function generateMetadata({ params }: any) {
  const { author, slug } = await params;
  const result = await db
    .select()
    .from(schema.Document)
    .where(
      and(
        eq(schema.Document.author, author),
        eq(schema.Document.slug, slug),
        eq(schema.Document.visibility, 'public'),
      ),
    )
    .limit(1);
  const doc = result[0];
  if (!doc) {
    return { title: 'Antwrite' };
  }
  const dateString = new Date(doc.createdAt).toLocaleDateString('en-US');
  const title = doc.title;
  const description = (doc.content ?? '').slice(0, 160);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const ogUrl = `${baseUrl}/api/og?type=post&title=${encodeURIComponent(
    title,
  )}&author=${encodeURIComponent(author)}&date=${encodeURIComponent(dateString)}`;
  return {
    title,
    description,
    openGraph: {
      url: `${baseUrl}/${author}/${slug}`,
      title,
      description,
      siteName: 'antwrite',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogUrl, alt: title }],
    },
  };
}

export default function BlogPageLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

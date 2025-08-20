'use client';

import { SidebarUserNav } from '@/components/sidebar/sidebar-user-nav';
import { SidebarDocuments } from '@/components/sidebar/sidebar-documents';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { FeedbackWidget } from '@/components/sidebar/feedback-widget';
import { GuestSidebarFooter } from '@/components/sidebar/guest-sidebar-footer';
import type { User } from '@/lib/auth';
import { Crimson_Text } from 'next/font/google';
import { useTheme } from '@/hooks/use-theme';
import Image from 'next/image';

const crimson = Crimson_Text({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export function AppSidebar({
  user,
  initialDocuments,
}: { user: User | undefined; initialDocuments?: any[] }) {
  const { setOpenMobile } = useSidebar();
  const { theme } = useTheme();

  // Check if user is a guest user
  const isGuestUser = user?.email === 'guest@antwrite.com' || !user;
  const isAuthenticatedUser = user && !isGuestUser;

  return (
    <Sidebar className="shadow-none">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center px-2">
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-2 hover:bg-accent rounded-sm px-2 py-1 transition-colors"
            >
              <Image
                // src={theme === 'dark' ? '/brand/antwrite-ltw.webp' : '/brand/antwrite-ltb.webp'}
                src={
                  theme === 'dark'
                    ? '/brand/logo/antwrite-tw.webp'
                    : '/brand/logo/antwrite-tb.webp'
                }
                alt="Antwrite"
                width={120}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-2">
          <SidebarDocuments
            user={isAuthenticatedUser ? user : undefined}
            initialDocuments={initialDocuments}
          />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2 flex flex-col space-y-2">
          {isAuthenticatedUser ? (
            <>
              <FeedbackWidget />
              <SidebarUserNav user={user} />
            </>
          ) : (
            <GuestSidebarFooter />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

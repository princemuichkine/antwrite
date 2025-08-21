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
  useSidebarWithSide,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { FeedbackWidget } from '@/components/sidebar/feedback-widget';
import { GuestSidebarFooter } from '@/components/sidebar/guest-sidebar-footer';
import type { User } from '@/lib/auth';
import { Crimson_Text } from 'next/font/google';
import { useTheme } from '@/hooks/use-theme';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const crimson = Crimson_Text({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Floating sidebar component that appears on hover (content only, no logo)
function FloatingSidebar({
  user,
  initialDocuments,
  isVisible,
}: {
  user: User | undefined;
  initialDocuments?: any[];
  isVisible: boolean;
}) {
  const { theme } = useTheme();
  const isGuestUser = user?.email === 'guest@antwrite.com' || !user;
  const isAuthenticatedUser = user && !isGuestUser;

  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed left-0 w-64 h-[calc(100vh-43px)] bg-sidebar border-r border-b border-border shadow-lg overflow-hidden ${isVisible ? 'rounded-r-sm z-50' : 'z-40'}`}
      style={{
        top: '43px',
        height: 'calc(100vh - 43px - 4px)' // 4px bottom gap for space
      }} // Exact position to match the separator line
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        duration: isVisible ? 0.2 : 0,
        ease: [0.4, 0.0, 0.2, 1]
      }}
    >
      <div className="h-full flex flex-col">
        {/* Content part only - no header/logo */}
        <div className="flex-1 overflow-hidden">
          <SidebarContent>
            <div className="px-2">
              <SidebarDocuments
                user={isAuthenticatedUser ? user : undefined}
                initialDocuments={initialDocuments}
              />
            </div>
          </SidebarContent>
        </div>

        {/* Footer */}
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
      </div>
    </motion.div>
  );
}

export function AppSidebar({
  user,
  initialDocuments,
}: { user: User | undefined; initialDocuments?: any[] }) {
  const { setOpenMobile, state } = useSidebar();
  const { theme } = useTheme();
  const [showFloatingSidebar, setShowFloatingSidebar] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if user is a guest user
  const isGuestUser = user?.email === 'guest@antwrite.com' || !user;
  const isAuthenticatedUser = user && !isGuestUser;

  // Handle hover detection on left side (below header area) - instant response
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isInTriggerArea = e.clientX <= 50 && e.clientY > 60 && state === 'collapsed';
      const isInFloatingSidebar = showFloatingSidebar && e.clientX <= 320 && e.clientY > 43; // 320px (w-64 + extra tolerance) + 43px top

      if (isInTriggerArea || isInFloatingSidebar) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setShowFloatingSidebar(true);
      } else {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        // Instant closing when sidebar is expanding, fast closing when just hovering
        const delay = state === 'expanded' ? 0 : 100;
        hoverTimeoutRef.current = setTimeout(() => {
          setShowFloatingSidebar(false);
        }, delay);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [state, showFloatingSidebar]);

  return (
    <>
      <Sidebar className="shadow-none border-b-0">
        <SidebarHeader>
          <SidebarMenu>
            <div className="flex flex-row justify-between items-center px-2">
              <Link
                href="/"
                onClick={() => setOpenMobile(false)}
                className="flex items-center gap-2 hover:bg-accent rounded-sm px-2 py-1 transition-colors -mt-1"
              >
                <Image
                  src={
                    theme === 'dark'
                      ? '/brand/antwrite-ltw.webp'
                      : '/brand/antwrite-ltb.webp'
                  }
                  // src={
                  //   theme === 'dark'
                  //     ? '/brand/logo/antwrite-tw.webp'
                  //     : '/brand/logo/antwrite-tb.webp'
                  // }
                  alt="Antwrite"
                  width={100}
                  height={24}
                  className="h-7 w-auto"
                  priority
                />
              </Link>
            </div>
            <div className="h-px bg-border -mt-0.5 mx-2 hidden" />
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

      {/* Floating sidebar that shows on hover when main sidebar is collapsed */}
      <AnimatePresence>
        {showFloatingSidebar && (
          <FloatingSidebar
            user={user}
            initialDocuments={initialDocuments}
            isVisible={showFloatingSidebar}
          />
        )}
      </AnimatePresence>
    </>
  );
}

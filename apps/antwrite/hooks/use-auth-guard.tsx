'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from 'react';
import { AuthModal } from '@/components/auth-modal';
import { WelcomeModal } from '@/components/welcome-modal';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type AuthGuardContextType = {
  isGuest: boolean;
};

const AuthGuardContext = createContext<AuthGuardContextType | null>(null);

export const useAuthGuard = () => {
  const context = useContext(AuthGuardContext);
  if (!context) {
    throw new Error('useAuthGuard must be used within an AuthGuardProvider');
  }
  return context;
};

// Hook to check if current user is anonymous
export const useIsAnonymous = () => {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAnonymousStatus = async () => {
      try {
        const session = await authClient.getSession();
        if (session.data?.user) {
          // User is authenticated, check if they're anonymous
          setIsAnonymous(false); // For now, we'll assume authenticated users are not anonymous
          // In the future, we could check session.data.user.isAnonymous if available
        } else {
          // User is not authenticated
          setIsAnonymous(false);
        }
      } catch (error) {
        console.error('Error checking anonymous status:', error);
        setIsAnonymous(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAnonymousStatus();
  }, []);

  return { isAnonymous, isLoading };
};

export const AuthGuardProvider = ({
  children,
  initialIsGuest = false,
}: {
  children: ReactNode;
  initialIsGuest?: boolean;
}) => {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(initialIsGuest);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [modalJustClosed, setModalJustClosed] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Check if welcome modal has been shown before
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenWelcome =
        localStorage.getItem('antwrite-welcome-shown') === 'true';
      setWelcomeShown(hasSeenWelcome);
    }
  }, []);

  // For guests: allow most interactions but block AI chat and certain sensitive areas
  useEffect(() => {
    if (!isGuest) return;

    const handleClick = (e: Event) => {
      // Don't trigger on the auth modal itself, welcome modal, theme toggle, sidebar components, or if modal just closed
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-auth-modal]') ||
        target.closest('[data-welcome-modal]') ||
        target.closest('[data-theme-toggle]') ||
        target.closest('[data-sidebar]') ||
        target.closest('[data-resizable-panel]') ||
        modalJustClosed
      )
        return;

      // Allow ALL document-related interactions (text editor, document creation, editing, etc.)
      if (
        target.closest('.editor-area') ||
        target.closest('.ProseMirror') ||
        target.closest('[data-create-document]') ||
        target.closest('[data-document-editor]') ||
        target.closest('button')?.textContent?.includes('Create') ||
        target.closest('button')?.textContent?.includes('New') ||
        target.closest('button')?.querySelector('svg') || // buttons with icons (like file plus)
        target.closest('[role="textbox"]') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]') ||
        // Allow document management buttons
        target.closest('button')?.textContent?.includes('Save') ||
        target.closest('button')?.textContent?.includes('Rename') ||
        target.closest('button')?.textContent?.includes('Edit') ||
        target.closest('button')?.textContent?.includes('Delete') ||
        // Allow toolbar interactions
        target.closest('[data-toolbar]') ||
        target.closest('.toolbar')
      ) {
        // Let all document editing and creation proceed - anonymous auth will handle it
        return;
      }

      // BLOCK AI chat interactions for guests
      if (
        target.closest('[data-chat-input]') ||
        target.closest('[data-multimodal-input]') ||
        target.closest('.chat-input') ||
        target.closest('[data-chat]') ||
        target.closest('button')?.textContent?.includes('Send') ||
        target.closest('button')?.textContent?.includes('Chat') ||
        target.closest('button')?.textContent?.includes('Ask') ||
        target.closest('[data-ai-chat]') ||
        target.closest('[data-ai-widget]') ||
        target.closest('[data-chat-widget]')
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Show auth modal for AI features
        if (!welcomeShown) {
          setShowWelcomeModal(true);
        } else {
          setShowAuthModal(true);
        }
        return;
      }

      // Allow other non-sensitive interactions (theme toggle, sidebar navigation, etc.)
      // Only block truly sensitive operations that need authentication
      if (
        target.closest('button')?.textContent?.includes('Upgrade') ||
        target.closest('button')?.textContent?.includes('Account') ||
        target.closest('[data-account]') ||
        target.closest('[data-billing]') ||
        target.closest('[data-settings]')
      ) {
        e.preventDefault();
        e.stopPropagation();

        if (!welcomeShown) {
          setShowWelcomeModal(true);
        } else {
          setShowAuthModal(true);
        }
        return;
      }

      // Let everything else proceed (navigation, UI interactions, etc.)
      return;
    };

    // Allow all keyboard input in document areas
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Allow all keyboard input in document editing areas
      if (
        target.closest('.editor-area') ||
        target.closest('.ProseMirror') ||
        target.closest('[data-document-editor]') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]') ||
        target.closest('[role="textbox"]')
      ) {
        // Let document editing proceed freely
        return;
      }

      // Block AI chat keyboard interactions
      if (
        target.closest('[data-chat-input]') ||
        target.closest('[data-multimodal-input]') ||
        target.closest('.chat-input') ||
        target.closest('[data-chat]')
      ) {
        e.preventDefault();
        e.stopPropagation();

        if (!welcomeShown) {
          setShowWelcomeModal(true);
        } else {
          setShowAuthModal(true);
        }
        return;
      }

      // Allow other keyboard interactions (navigation, shortcuts, etc.)
      return;
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isGuest, modalJustClosed, welcomeShown]);

  // Reset modalJustClosed after a brief delay
  useEffect(() => {
    if (modalJustClosed) {
      const timer = setTimeout(() => setModalJustClosed(false), 200);
      return () => clearTimeout(timer);
    }
  }, [modalJustClosed]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setModalJustClosed(true);
    router.refresh(); // Refresh to get authenticated state
  };

  const handleAuthModalOpenChange = (open: boolean) => {
    setShowAuthModal(open);
    if (!open) {
      setModalJustClosed(true);
    }
  };

  const handleWelcomeModalOpenChange = (open: boolean) => {
    setShowWelcomeModal(open);
    if (!open) {
      // Mark welcome as shown and show auth modal
      localStorage.setItem('antwrite-welcome-shown', 'true');
      setWelcomeShown(true);
      setModalJustClosed(true);
      // Small delay to prevent immediate trigger
      setTimeout(() => setShowAuthModal(true), 100);
    }
  };

  return (
    <AuthGuardContext.Provider value={{ isGuest }}>
      {children}
      <WelcomeModal
        open={showWelcomeModal}
        onOpenChange={handleWelcomeModalOpenChange}
      />
      <AuthModal
        open={showAuthModal}
        onOpenChange={handleAuthModalOpenChange}
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </AuthGuardContext.Provider>
  );
};

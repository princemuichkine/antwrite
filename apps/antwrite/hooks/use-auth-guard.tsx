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
      const hasSeenWelcome = localStorage.getItem('antwrite-welcome-shown') === 'true';
      setWelcomeShown(hasSeenWelcome);
    }
  }, []);

  // Simple: if guest clicks anywhere, show modal
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

      e.preventDefault();
      e.stopPropagation();

      // Show welcome modal first if not shown before, otherwise show auth modal
      if (!welcomeShown) {
        setShowWelcomeModal(true);
      } else {
        setShowAuthModal(true);
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleClick, true);
    document.addEventListener('input', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleClick, true);
      document.removeEventListener('input', handleClick, true);
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

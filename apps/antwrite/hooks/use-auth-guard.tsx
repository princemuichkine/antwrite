'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthModal } from '@/components/auth-modal';
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
    initialIsGuest = false
}: {
    children: ReactNode;
    initialIsGuest?: boolean;
}) => {
    const router = useRouter();
    const [isGuest, setIsGuest] = useState(initialIsGuest);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const [modalJustClosed, setModalJustClosed] = useState(false);

    // Simple: if guest clicks anywhere, show modal
    useEffect(() => {
        if (!isGuest) return;

        const handleClick = (e: Event) => {
            // Don't trigger on the auth modal itself or if modal just closed
            const target = e.target as HTMLElement;
            if (target.closest('[data-auth-modal]') || modalJustClosed) return;

            e.preventDefault();
            e.stopPropagation();
            setShowAuthModal(true);
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleClick, true);
        document.addEventListener('input', handleClick, true);

        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleClick, true);
            document.removeEventListener('input', handleClick, true);
        };
    }, [isGuest, modalJustClosed]);

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

    const handleModalOpenChange = (open: boolean) => {
        setShowAuthModal(open);
        if (!open) {
            setModalJustClosed(true);
        }
    };

    return (
        <AuthGuardContext.Provider value={{ isGuest }}>
            {children}
            <AuthModal
                open={showAuthModal}
                onOpenChange={handleModalOpenChange}
                mode={authMode}
                onModeChange={setAuthMode}
                onAuthSuccess={handleAuthSuccess}
            />
        </AuthGuardContext.Provider>
    );
};

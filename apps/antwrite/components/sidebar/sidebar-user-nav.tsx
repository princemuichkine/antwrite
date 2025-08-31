'use client';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/components/toast';
import type { ClientUser as User } from '@/lib/auth-client';
import { LottieIcon } from '@/components/ui/lottie-icon';
import { animations } from '@/lib/utils/lottie-animations';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Paywall } from '@/components/paywall';
import { WelcomeModal } from '@/components/welcome-modal';

type Subscription = {
  id: string;
  plan: string;
  status: string;
  trialEnd?: Date | string | null;
  periodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean;
};

function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
}

function formatPlanName(planName: string | undefined | null): string {
  if (!planName) return 'Unknown Plan';
  return planName.charAt(0).toUpperCase() + planName.slice(1);
}

export function SidebarUserNav({ user }: { user: User | null }) {
  const { setTheme, theme } = useTheme();
  const router = useRouter();

  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState(false);
  const [hoveredSignOut, setHoveredSignOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );

  const isStripeEnabled = process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

  useEffect(() => {
    if (!isStripeEnabled || !user) {
      setIsSubscriptionLoading(false);
      return;
    }

    let isMounted = true;
    setIsSubscriptionLoading(true);
    setSubscriptionError(null);

    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/user/subscription-status');
        const result = await res.json();
        if (!isMounted) return;
        if (!res.ok) {
          throw new Error(result.error || 'Failed to load subscription info.');
        }
        if (result.hasActiveSubscription) {
          setSubscription({
            id: '',
            plan: 'pro',
            status: 'active',
            trialEnd: null,
            periodEnd: null,
            cancelAtPeriodEnd: false,
          });
        } else {
          setSubscription(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching subscription:', err);
        setSubscriptionError(
          err.message || 'Could not load subscription info.',
        );
        setSubscription(null);
      } finally {
        if (isMounted) setIsSubscriptionLoading(false);
      }
    };

    fetchSubscription();
    return () => {
      isMounted = false;
    };
  }, [user, isStripeEnabled]);

  const handleSignOut = async () => {
    setIsSignOutLoading(true);
    await authClient.signOut(
      {},
      {
        onRequest: () => {
          setIsSignOutLoading(true);
        },
        onSuccess: () => {
          router.push('/');
          router.refresh();
        },
        onError: (ctx) => {
          setIsSignOutLoading(false);
          console.error('Error signing out:', ctx.error);
          toast({
            type: 'error',
            description: ctx.error.message || 'Failed to sign out.',
          });
        },
      },
    );
  };

  const handleManageBilling = async () => {
    if (
      isBillingLoading ||
      isSubscriptionLoading ||
      subscriptionError ||
      !subscription
    )
      return;
    setIsBillingLoading(true);
    try {
      const { error: cancelError } = await authClient.subscription.cancel({
        returnUrl: window.location.href,
      });
      if (cancelError)
        throw new Error(
          cancelError.message || 'Failed to redirect to billing portal.',
        );
    } catch (err: any) {
      console.error('handleManageBilling error:', err);
      toast({
        type: 'error',
        description: err.message || 'Could not open billing portal.',
      });
      setIsBillingLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  let statusText = 'No active plan';
  let planName = 'Free';
  let ctaText = 'Subscribe';
  let ctaAction = () => setIsPaywallOpen(true);
  let ctaLoading = isSubscriptionLoading;

  if (isSubscriptionLoading) {
    statusText = 'Loading...';
    planName = 'Checking';
  } else if (subscriptionError) {
    statusText = 'Error loading status';
    planName = 'Error';
  } else if (subscription) {
    planName = formatPlanName(subscription.plan);
    const now = new Date();
    if (subscription.status === 'trialing') {
      const trialEndDate = subscription.trialEnd || subscription.periodEnd;
      const ends = new Date(trialEndDate || '').getTime();
      if (ends > now.getTime()) {
        statusText = `Trial ends ${formatDate(trialEndDate)}`;
        ctaText = 'Upgrade';
        ctaAction = () => setIsPaywallOpen(true);
        ctaLoading = isSubscriptionLoading;
      } else {
        statusText = `Trial ended ${formatDate(trialEndDate)}`;
        ctaText = 'Subscribe';
        ctaAction = () => setIsPaywallOpen(true);
        ctaLoading = isSubscriptionLoading;
      }
    } else if (subscription.status === 'active') {
      if (subscription.cancelAtPeriodEnd) {
        statusText = `Cancels ${formatDate(subscription.periodEnd)}`;
      } else {
        statusText = `Renews ${formatDate(subscription.periodEnd)}`;
      }
      ctaText = 'Manage';
      ctaAction = handleManageBilling;
      ctaLoading = isBillingLoading;
    }
  }

  const isLoading =
    isSignOutLoading || isBillingLoading || isSubscriptionLoading;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              <SidebarMenuButton className="border data-[state=open]:border-border text-accent-foreground data-[state=open]:text-sidebar-accent-foreground w-full h-10">
                <span className="truncate">{user.email ?? 'User'}</span>
                {isDropdownOpen ? (
                  <ChevronUp className="ml-auto" />
                ) : (
                  <ChevronDown className="ml-auto" />
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width] min-w-full"
            >
              {isStripeEnabled && (
                <>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Subscription
                  </DropdownMenuLabel>
                  <div className="px-2 py-1.5 text-sm space-y-1">
                    <p className="font-medium">{planName}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusText}
                    </p>
                    <button
                      type="button"
                      onClick={ctaAction}
                      disabled={ctaLoading}
                      className="mt-2 w-full text-left text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {ctaLoading ? (
                        <Loader2 className="size-4 animate-spin inline-block mr-1 text-muted-foreground" />
                      ) : (
                        ctaText
                      )}
                    </button>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer w-full"
                onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                onMouseEnter={() => setHoveredTheme(true)}
                onMouseLeave={() => setHoveredTheme(false)}
                disabled={isLoading}
              >
                <LottieIcon
                  animationData={
                    theme === 'dark' ? animations.sun : animations.point
                  }
                  size={19}
                  loop={false}
                  autoplay={false}
                  initialFrame={0}
                  isHovered={hoveredTheme}
                />
                {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer w-full"
                onSelect={() =>
                  window.open(
                    'https://github.com/princemuichkine/antwrite',
                    '_blank',
                  )
                }
                disabled={isLoading}
              >
                <LottieIcon
                  animationData={animations.code}
                  size={19}
                  loop={false}
                  autoplay={false}
                  initialFrame={0}
                />
                Open-source
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer w-full"
                onSelect={() => setIsWelcomeModalOpen(true)}
                disabled={isLoading}
              >
                <LottieIcon
                  animationData={animations.star}
                  size={19}
                  loop={false}
                  autoplay={false}
                  initialFrame={0}
                />
                About us
              </DropdownMenuItem>

              {!isStripeEnabled && <DropdownMenuSeparator />}

              <DropdownMenuItem
                className="cursor-pointer w-full"
                onSelect={handleSignOut}
                onMouseEnter={() => setHoveredSignOut(true)}
                onMouseLeave={() => setHoveredSignOut(false)}
                disabled={isLoading}
              >
                {isSignOutLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Signing
                    out...
                  </>
                ) : (
                  <>
                    <LottieIcon
                      animationData={animations.logout}
                      size={19}
                      loop={false}
                      autoplay={false}
                      initialFrame={0}
                      isHovered={hoveredSignOut}
                    />
                    Sign out
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <Paywall isOpen={isPaywallOpen} onOpenChange={setIsPaywallOpen} />
      <WelcomeModal open={isWelcomeModalOpen} onOpenChange={setIsWelcomeModalOpen} />
    </>
  );
}

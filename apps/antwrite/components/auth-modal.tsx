'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { toast } from '@/components/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogoGoogle, GitIcon, LoaderIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Client-side check for enabled providers
// Enable by default in development, or when explicitly set to 'true'
const isDev = process.env.NODE_ENV === 'development';
const googleEnabled =
  isDev || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
const githubEnabled =
  isDev || process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
const linkedinEnabled =
  isDev || process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === 'true';

const microsoftEnabled =
  isDev || process.env.NEXT_PUBLIC_MICROSOFT_ENABLED === 'true';
const emailVerificationEnabled =
  process.env.NEXT_PUBLIC_EMAIL_VERIFY_ENABLED === 'true';

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'login' | 'signup';
  onModeChange?: (mode: 'login' | 'signup') => void;
  onAuthSuccess?: () => void;
};

export const AuthModal = ({
  open,
  onOpenChange,
  mode = 'signup',
  onModeChange,
  onAuthSuccess,
}: AuthModalProps) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState<
    'request' | 'reset' | null
  >(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Only reset forgot password state on successful completion or explicit back navigation
  const handleModalOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Don't reset forgot password state when modal closes - preserve user's progress
  };

  const handleEmailAuth = async (formData: FormData) => {
    // Use state values instead of FormData since inputs are controlled
    const currentEmail = email;
    const currentPassword = password;

    if (mode === 'signup') {
      const name = currentEmail.split('@')[0] || 'User';
      setIsEmailLoading(true);
      setIsSuccessful(false);
      setIsSocialLoading(null);

      await authClient.signUp.email(
        {
          email: currentEmail,
          password: currentPassword,
          name,
        },
        {
          onRequest: () => { },
          onSuccess: (ctx: any) => {
            setIsEmailLoading(false);
            if (emailVerificationEnabled) {
              setIsSuccessful(false);
              toast({
                type: 'success',
                description: 'Account created! Check your email to verify.',
              });
              onOpenChange(false);
            } else {
              setIsSuccessful(true);
              toast({
                type: 'success',
                description: 'Account created! Welcome to antwrite!',
              });
              // Clear inputs on successful auth
              setEmail('');
              setPassword('');
              onOpenChange(false);
              onAuthSuccess?.();
            }
          },
          onError: (ctx: any) => {
            setIsEmailLoading(false);
            setIsSuccessful(false);
            console.error('Email Signup Error:', ctx.error);
            toast({
              type: 'error',
              description: ctx.error.message || 'Failed to create account.',
            });
          },
        },
      );
    } else {
      // Redirect mobile users to home page instead of documents
      const callbackURL = isMobile ? '/home' : '/documents';

      await authClient.signIn.email(
        {
          email: currentEmail,
          password: currentPassword,
          callbackURL,
        },
        {
          onRequest: () => {
            setIsEmailLoading(true);
            setIsSuccessful(false);
            setIsSocialLoading(null);
          },
          onSuccess: (ctx: any) => {
            setIsEmailLoading(false);
            setIsSuccessful(true);
            toast({
              type: 'success',
              description: 'Signed in successfully! Welcome back!',
            });
            // Clear inputs on successful auth
            setEmail('');
            setPassword('');
            onOpenChange(false);
            onAuthSuccess?.();
          },
          onError: (ctx: any) => {
            setIsEmailLoading(false);
            setIsSuccessful(false);
            console.error('Email Login Error:', ctx.error);
            toast({
              type: 'error',
              description: ctx.error.message || 'Failed to sign in.',
            });
          },
        },
      );
    }
  };

  const handleSocialLogin = async (
    provider: 'google' | 'github' | 'linkedin' | 'microsoft',
  ) => {
    // Redirect mobile users to home page instead of documents
    const callbackURL = isMobile ? '/home' : '/documents';

    // Add performance optimization: Use requestIdleCallback for non-critical operations
    const performSocialLogin = () => {
      return authClient.signIn.social(
        {
          provider,
          callbackURL,
          errorCallbackURL: '/?error=social_signin_failed',
        },
        {
          onRequest: () => {
            setIsSocialLoading(provider);
            setIsSuccessful(false);
            setIsEmailLoading(false);
          },
          onError: (ctx: any) => {
            setIsSocialLoading(null);
            setIsSuccessful(false);
            console.error(`Social Auth Error (${provider}):`, ctx.error);
            toast({
              type: 'error',
              description:
                ctx.error.message || `Failed to authenticate with ${provider}.`,
            });
          },
        },
      );
    };

    // Immediate execution for better perceived performance
    await performSocialLogin();
  };



  const toggleMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login';
    onModeChange?.(newMode);
  };

  const handleForgotPassword = async (formData: FormData) => {
    const email = formData.get('email') as string;
    setIsEmailLoading(true);

    try {
      await authClient.forgetPassword.emailOtp({
        email,
      });

      setEmail(email);
      setForgotPasswordMode('reset');
      setIsEmailLoading(false);
      toast({
        type: 'success',
        description: 'Password reset code sent to your email.',
      });
    } catch (error: any) {
      setIsEmailLoading(false);
      console.error('Forgot password error:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to send reset code.',
      });
    }
  };

  const handlePasswordReset = async (formData: FormData) => {
    const otp = formData.get('otp') as string;
    const password = formData.get('newPassword') as string;
    setIsEmailLoading(true);

    try {
      await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      setIsEmailLoading(false);
      setForgotPasswordMode(null);
      setOtpCode('');
      setNewPassword('');
      toast({
        type: 'success',
        description: 'Password reset successfully! You can now sign in.',
      });
    } catch (error: any) {
      setIsEmailLoading(false);
      console.error('Password reset error:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to reset password.',
      });
    }
  };

  const hasSocialProviders =
    googleEnabled || githubEnabled || linkedinEnabled || microsoftEnabled;

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        data-auth-modal
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {forgotPasswordMode === 'request'
              ? 'Reset your password'
              : forgotPasswordMode === 'reset'
                ? 'Enter reset code'
                : mode === 'signup'
                  ? 'Create an account'
                  : 'Welcome back'}
          </DialogTitle>
          <DialogDescription>
            {forgotPasswordMode === 'request'
              ? 'Enter your email to receive a reset code.'
              : forgotPasswordMode === 'reset'
                ? 'Enter the code sent to your email and your new password.'
                : mode === 'signup'
                  ? 'Get started with Antwrite in seconds.'
                  : 'Sign in to continue to your documents.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Forgot Password Request Screen */}
          {forgotPasswordMode === 'request' && (
            <>
              <form action={handleForgotPassword} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800"
                  disabled={isEmailLoading}
                >
                  {isEmailLoading ? (
                    <span className="flex items-center gap-2">
                      <LoaderIcon size={16} />
                      Sending...
                    </span>
                  ) : (
                    'Send email'
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordMode(null);
                    setOtpCode('');
                    setNewPassword('');
                  }}
                  className="font-medium text-muted-foreground hover:text-primary"
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}

          {/* Password Reset Screen */}
          {forgotPasswordMode === 'reset' && (
            <>
              <form action={handlePasswordReset} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    className="h-9"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800"
                  disabled={isEmailLoading}
                >
                  {isEmailLoading ? (
                    <span className="flex items-center gap-2">
                      <LoaderIcon size={16} />
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode('request')}
                  className="font-medium text-muted-foreground hover:text-primary"
                >
                  Send again
                </button>
                {' or '}
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordMode(null);
                    setOtpCode('');
                    setNewPassword('');
                  }}
                  className="font-medium text-muted-foreground hover:text-primary"
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}

          {/* Regular Auth Forms */}
          {!forgotPasswordMode && (
            <>
              {/* Email/Password Form */}
              <form action={handleEmailAuth} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-9 pr-24"
                    />
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordMode('request')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-primary hover:underline-offset-2"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800"
                  disabled={
                    isEmailLoading || isSocialLoading !== null || isSuccessful
                  }
                >
                  {isSuccessful ? (
                    <>✓ Success</>
                  ) : isEmailLoading ? (
                    <span className="flex items-center gap-2">
                      <LoaderIcon size={16} />
                      {mode === 'signup' ? 'Creating...' : 'Signing In...'}
                    </span>
                  ) : mode === 'signup' ? (
                    'Create'
                  ) : (
                    'Connect'
                  )}
                </Button>
              </form>



              {/* Social Login Section */}
              {hasSocialProviders && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        OR CONTINUE WITH
                      </span>
                    </div>
                  </div>

                  {/* First row: Google and GitHub (50% each) */}
                  <div className="grid grid-cols-2 gap-2">
                    {googleEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialLogin('google')}
                        disabled={isSocialLoading !== null || isEmailLoading}
                        className="h-9"
                      >
                        {isSocialLoading === 'google' ? (
                          <LoaderIcon size={16} />
                        ) : (
                          <LogoGoogle size={16} />
                        )}
                        <span className="ml-1 text-sm">Google</span>
                      </Button>
                    )}

                    {githubEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialLogin('github')}
                        disabled={isSocialLoading !== null || isEmailLoading}
                        className="h-9"
                      >
                        {isSocialLoading === 'github' ? (
                          <LoaderIcon size={16} />
                        ) : (
                          <div className="size-4 flex items-center justify-center">
                            <GitIcon />
                          </div>
                        )}
                        <span className="ml-1 text-sm">GitHub</span>
                      </Button>
                    )}
                  </div>

                  {/* Third row: Microsoft and LinkedIn (50/50) */}
                  {(microsoftEnabled || linkedinEnabled) && (
                    <div className="grid grid-cols-2 gap-2">
                      {microsoftEnabled && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('microsoft')}
                          disabled={isSocialLoading !== null || isEmailLoading}
                          className="h-9"
                        >
                          {isSocialLoading === 'microsoft' ? (
                            <LoaderIcon size={16} />
                          ) : (
                            <svg
                              className="size-4"
                              viewBox="0 0 48 48"
                              fill="none"
                            >
                              <path
                                fill="#ff5722"
                                d="M6 6H22V22H6z"
                                transform="rotate(-180 14 14)"
                              />
                              <path
                                fill="#4caf50"
                                d="M26 6H42V22H26z"
                                transform="rotate(-180 34 14)"
                              />
                              <path
                                fill="#ffc107"
                                d="M26 26H42V42H26z"
                                transform="rotate(-180 34 34)"
                              />
                              <path
                                fill="#03a9f4"
                                d="M6 26H22V42H6z"
                                transform="rotate(-180 14 34)"
                              />
                            </svg>
                          )}
                          <span className="ml-0.5 text-sm">Microsoft</span>
                        </Button>
                      )}
                      {linkedinEnabled && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('linkedin')}
                          disabled={isSocialLoading !== null || isEmailLoading}
                          className="h-9"
                        >
                          {isSocialLoading === 'linkedin' ? (
                            <LoaderIcon size={16} />
                          ) : (
                            <svg
                              className="size-4 rounded-sm"
                              viewBox="0 0 24 24"
                            >
                              {/* White background */}
                              <rect width="24" height="24" fill="white" />
                              {/* LinkedIn logo in official blue */}
                              <path
                                d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                                fill="#0077B5"
                              />
                            </svg>
                          )}
                          <span className="ml-1 text-sm">LinkedIn</span>
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Toggle between login/signup */}
              <div className="text-center text-sm text-muted-foreground">
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="font-medium text-muted-foreground hover:text-primary"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="font-medium text-muted-foreground hover:text-primary"
                    >
                      Create one
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

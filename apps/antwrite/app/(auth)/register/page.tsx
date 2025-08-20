'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { toast } from '@/components/toast';
import { SubmitButton } from '@/components/submit-button';
import {
  LogoGoogle,
  GitIcon,
  LogoLinkedIn,
  LogoMicrosoft,
  LoaderIcon,
} from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Enable by default in development, or when explicitly set to 'true'
const isDev = process.env.NODE_ENV === 'development';
const googleEnabled = isDev || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
const githubEnabled = isDev || process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
const linkedinEnabled = isDev || process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === 'true';

const microsoftEnabled = isDev || process.env.NEXT_PUBLIC_MICROSOFT_ENABLED === 'true';
const emailVerificationEnabled =
  process.env.NEXT_PUBLIC_EMAIL_VERIFY_ENABLED === 'true';

export default function RegisterPage() {
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [email, setEmail] = useState('');

  const handleEmailSignup = async (formData: FormData) => {
    const emailValue = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = emailValue.split('@')[0] || 'User';
    setEmail(emailValue);
    setIsEmailLoading(true);
    setIsSuccessful(false);
    setIsSocialLoading(null);

    await authClient.signUp.email(
      {
        email: emailValue,
        password,
        name,
      },
      {
        onRequest: () => { },
        onSuccess: (ctx) => {
          setIsEmailLoading(false);
          if (emailVerificationEnabled) {
            setIsSuccessful(false);
            toast({
              type: 'success',
              description: 'Account created! Check your email to verify.',
            });
            router.push('/login');
          } else {
            setIsSuccessful(true);
            toast({
              type: 'success',
              description: 'Account created! Redirecting...',
            });
            router.push('/documents');
          }
        },
        onError: (ctx) => {
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
  };

  const handleSocialLogin = async (
    provider: 'google' | 'github' | 'linkedin' | 'microsoft',
  ) => {
    await authClient.signIn.social(
      {
        provider,
        callbackURL: '/documents',
        errorCallbackURL: '/register?error=social_signin_failed',
      },
      {
        onRequest: () => {
          setIsSocialLoading(provider);
          setIsSuccessful(false);
          setIsEmailLoading(false);
        },
        onError: (ctx) => {
          setIsSocialLoading(null);
          setIsSuccessful(false);
          console.error(`Social Sign Up/In Error (${provider}):`, ctx.error);
          toast({
            type: 'error',
            description:
              ctx.error.message || `Failed to sign up/in with ${provider}.`,
          });
        },
      },
    );
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-8 text-center">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create your account with email and password
          </p>
        </div>

        <div className="px-8 flex flex-col gap-6">
          {/* Email/Password Form */}
          <form action={handleEmailSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                defaultValue={email}
                required
                className="h-12 border rounded-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 border rounded-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black dark:bg-gray-800 dark:text-white"
              />
            </div>
            <SubmitButton isSuccessful={isSuccessful}>
              Sign Up
            </SubmitButton>
          </form>

          {/* Social Login Section */}
          {(googleEnabled ||
            githubEnabled ||
            linkedinEnabled ||
            microsoftEnabled) && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Google OAuth Button */}
                  {googleEnabled && (
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isSocialLoading !== null || isEmailLoading}
                      className="w-full h-12 px-3 rounded-sm bg-[#EA4335] hover:bg-[#d33b2c] text-white text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center">
                        {isSocialLoading === 'google' ? (
                          <LoaderIcon size={20} />
                        ) : (
                          <LogoGoogle size={20} />
                        )}
                        <span className="ml-2">Continue with Google</span>
                      </div>
                    </button>
                  )}

                  {/* GitHub OAuth Button */}
                  {githubEnabled && (
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('github')}
                      disabled={isSocialLoading !== null || isEmailLoading}
                      className="w-full h-12 px-3 rounded-sm bg-[#333] hover:bg-[#444] dark:bg-[#171515] dark:hover:bg-[#2b2a2a] text-white text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center">
                        {isSocialLoading === 'github' ? (
                          <LoaderIcon size={20} />
                        ) : (
                          <GitIcon />
                        )}
                        <span className="ml-2">Continue with GitHub</span>
                      </div>
                    </button>
                  )}

                  {/* Microsoft OAuth Button */}
                  {microsoftEnabled && (
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('microsoft')}
                      disabled={isSocialLoading !== null || isEmailLoading}
                      className="w-full h-12 px-3 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center">
                        {isSocialLoading === 'microsoft' ? (
                          <LoaderIcon size={20} />
                        ) : (
                          <svg className="size-5" viewBox="0 0 48 48" fill="none">
                            <path fill="#ff5722" d="M6 6H22V22H6z" transform="rotate(-180 14 14)"></path>
                            <path fill="#4caf50" d="M26 6H42V22H26z" transform="rotate(-180 34 14)"></path>
                            <path fill="#ffc107" d="M26 26H42V42H26z" transform="rotate(-180 34 34)"></path>
                            <path fill="#03a9f4" d="M6 26H22V42H6z" transform="rotate(-180 14 34)"></path>
                          </svg>
                        )}
                        <span className="ml-2">Continue with Microsoft</span>
                      </div>
                    </button>
                  )}

                  {/* LinkedIn OAuth Button */}
                  {linkedinEnabled && (
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('linkedin')}
                      disabled={isSocialLoading !== null || isEmailLoading}
                      className="w-full h-12 px-3 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center">
                        {isSocialLoading === 'linkedin' ? (
                          <LoaderIcon size={20} />
                        ) : (
                          <svg className="size-4 rounded-[1.5px]" viewBox="0 0 24 24">
                            {/* White background */}
                            <rect width="24" height="24" fill="white" />
                            {/* LinkedIn logo in official blue */}
                            <path
                              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                              fill="#0077B5"
                            />
                          </svg>
                        )}
                        <span className="ml-2">Continue with LinkedIn</span>
                      </div>
                    </button>
                  )}


                </div>
              </>
            )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {'Already have an account ? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {' instead.'}
          </p>
        </div>
      </div>
    </div>
  );
}

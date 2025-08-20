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
  LogoTwitter,
  LogoMicrosoft,
  LoaderIcon,
} from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
const linkedinEnabled = process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === 'true';
const twitterEnabled = process.env.NEXT_PUBLIC_TWITTER_ENABLED === 'true';
const microsoftEnabled = process.env.NEXT_PUBLIC_MICROSOFT_ENABLED === 'true';
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
        onRequest: () => {},
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
    provider: 'google' | 'github' | 'linkedin' | 'twitter' | 'microsoft',
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
                placeholder="you@example.com"
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
            <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
          </form>

          {/* Social Login Section */}
          {(googleEnabled ||
            githubEnabled ||
            linkedinEnabled ||
            twitterEnabled ||
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
                    className="w-full h-12 px-3 rounded-sm bg-white hover:bg-gray-50 dark:bg-white dark:hover:bg-gray-50 text-gray-600 dark:text-gray-600 border border-gray-300 text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      {isSocialLoading === 'microsoft' ? (
                        <LoaderIcon size={20} />
                      ) : (
                        <LogoMicrosoft size={20} />
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
                    className="w-full h-12 px-3 rounded-sm bg-[#0077B5] hover:bg-[#006699] text-white text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      {isSocialLoading === 'linkedin' ? (
                        <LoaderIcon size={20} />
                      ) : (
                        <LogoLinkedIn size={20} />
                      )}
                      <span className="ml-2">Continue with LinkedIn</span>
                    </div>
                  </button>
                )}

                {/* Twitter OAuth Button */}
                {twitterEnabled && (
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('twitter')}
                    disabled={isSocialLoading !== null || isEmailLoading}
                    className="w-full h-12 px-3 rounded-sm bg-[#000000] hover:bg-[#1a1a1a] text-white text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      {isSocialLoading === 'twitter' ? (
                        <LoaderIcon size={20} />
                      ) : (
                        <LogoTwitter size={20} />
                      )}
                      <span className="ml-2">Continue with Twitter</span>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {'Already have an account? '}
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

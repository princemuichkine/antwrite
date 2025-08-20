'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  LogoGoogle,
  GitIcon,
  LoaderIcon,
  LogoLinkedIn,
  LogoMicrosoft,
} from '@/components/icons';
import type { ReactNode } from 'react';

interface AuthFormProps {
  action: (formData: FormData) => void;
  defaultEmail?: string;
  children: ReactNode;
  showSocialLogins?: boolean;
  googleEnabled?: boolean;
  githubEnabled?: boolean;
  linkedinEnabled?: boolean;

  microsoftEnabled?: boolean;
  onSocialLogin?: (
    provider: 'google' | 'github' | 'linkedin' | 'microsoft',
  ) => void;
  isSocialLoading?: string | null;
  isEmailLoading?: boolean;
}

export function AuthForm({
  action,
  defaultEmail = '',
  children,
  showSocialLogins = false,
  googleEnabled = false,
  githubEnabled = false,
  linkedinEnabled = false,

  microsoftEnabled = false,
  onSocialLogin = () => { },
  isSocialLoading = null,
  isEmailLoading = false,
}: AuthFormProps) {
  const anySocialEnabled =
    googleEnabled ||
    githubEnabled ||
    linkedinEnabled ||
    microsoftEnabled;
  const isLoading = !!isSocialLoading || isEmailLoading;

  return (
    <form action={action} className="flex flex-col gap-6 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          defaultValue={defaultEmail}
          required
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
        />
      </div>
      {children}

      {showSocialLogins && anySocialEnabled && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {googleEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onSocialLogin('google')}
                disabled={isLoading}
              >
                {isSocialLoading === 'google' ? (
                  <span className="mr-2 size-4">
                    <LoaderIcon size={16} />
                  </span>
                ) : (
                  <span className="mr-2 size-4">
                    <LogoGoogle size={16} />
                  </span>
                )}{' '}
                Google
              </Button>
            )}
            {githubEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onSocialLogin('github')}
                disabled={isLoading}
              >
                {isSocialLoading === 'github' ? (
                  <span className="mr-2 size-4">
                    <LoaderIcon size={16} />
                  </span>
                ) : (
                  <span className="mr-2 size-4">
                    <GitIcon />
                  </span>
                )}{' '}
                GitHub
              </Button>
            )}
            {linkedinEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onSocialLogin('linkedin')}
                disabled={isLoading}
              >
                {isSocialLoading === 'linkedin' ? (
                  <span className="mr-2 size-4">
                    <LoaderIcon size={16} />
                  </span>
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
                )}{' '}
                LinkedIn
              </Button>
            )}

            {microsoftEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onSocialLogin('microsoft')}
                disabled={isLoading}
              >
                {isSocialLoading === 'microsoft' ? (
                  <span className="size-4 mr-2">
                    <LoaderIcon size={16} />
                  </span>
                ) : (
                  <svg className="size-4 mr-2" viewBox="0 0 48 48" fill="none">
                    <path fill="#ff5722" d="M6 6H22V22H6z" transform="rotate(-180 14 14)"></path>
                    <path fill="#4caf50" d="M26 6H42V22H26z" transform="rotate(-180 34 14)"></path>
                    <path fill="#ffc107" d="M26 26H42V42H26z" transform="rotate(-180 34 34)"></path>
                    <path fill="#03a9f4" d="M6 26H22V42H6z" transform="rotate(-180 14 34)"></path>
                  </svg>
                )}{' '}
                Microsoft
              </Button>
            )}
          </div>
        </>
      )}
    </form>
  );
}

import { createAuthClient } from 'better-auth/react';
import { stripeClient } from '@better-auth/stripe/client';
import { emailOTPClient, anonymousClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [
    stripeClient({
      subscription: true,
    }),
    emailOTPClient(),
    anonymousClient(),
  ],
});

export type ClientSession = typeof authClient.$Infer.Session;
export type ClientUser = ClientSession['user'];

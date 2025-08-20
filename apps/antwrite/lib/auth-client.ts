import { createAuthClient } from 'better-auth/react';
import { stripeClient } from '@better-auth/stripe/client';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [
    stripeClient({
      subscription: true,
    }),
    emailOTPClient(),
  ],
});

export type ClientSession = typeof authClient.$Infer.Session;
export type ClientUser = ClientSession['user'];

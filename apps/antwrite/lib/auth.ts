import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db, } from '@antwrite/db';
import Stripe from 'stripe';
import { stripe } from '@better-auth/stripe';
import { Resend } from 'resend';

const googleEnabled = process.env.GOOGLE_ENABLED === 'true';
const githubEnabled = process.env.GITHUB_ENABLED === 'true';
const linkedinEnabled = process.env.LINKEDIN_ENABLED === 'true';
const twitterEnabled = process.env.TWITTER_ENABLED === 'true';
const microsoftEnabled = process.env.MICROSOFT_ENABLED === 'true';

const stripeEnabled =
  process.env.STRIPE_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('Missing BETTER_AUTH_SECRET environment variable');
}
if (!process.env.BETTER_AUTH_URL) {
  throw new Error('Missing BETTER_AUTH_URL environment variable');
}

if (stripeEnabled) {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error('Missing STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  if (!process.env.STRIPE_PRO_MONTHLY_PRICE_ID)
    throw new Error('Missing STRIPE_PRO_MONTHLY_PRICE_ID');
  if (!process.env.STRIPE_PRO_YEARLY_PRICE_ID)
    throw new Error('Missing STRIPE_PRO_YEARLY_PRICE_ID');
}

const emailVerificationEnabled = process.env.EMAIL_VERIFY_ENABLED === 'true';
console.log(`Email Verification Enabled: ${emailVerificationEnabled}`);

if (emailVerificationEnabled) {
  if (!process.env.RESEND_API_KEY)
    throw new Error(
      'Missing RESEND_API_KEY because EMAIL_VERIFY_ENABLED is true',
    );
  if (!process.env.EMAIL_FROM)
    throw new Error('Missing EMAIL_FROM because EMAIL_VERIFY_ENABLED is true');
}

if (stripeEnabled) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is missing but STRIPE_ENABLED is true.',
    );
  }
  if (!process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
    throw new Error(
      'STRIPE_PRO_MONTHLY_PRICE_ID environment variable is missing but STRIPE_ENABLED is true.',
    );
  }
  if (!process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
    throw new Error(
      'STRIPE_PRO_YEARLY_PRICE_ID environment variable is missing but STRIPE_ENABLED is true.',
    );
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is missing but STRIPE_ENABLED is true.',
    );
  }
}

if (googleEnabled) {
  if (!process.env.GOOGLE_CLIENT_ID)
    throw new Error('Missing GOOGLE_CLIENT_ID because GOOGLE_ENABLED is true');
  if (!process.env.GOOGLE_CLIENT_SECRET)
    throw new Error(
      'Missing GOOGLE_CLIENT_SECRET because GOOGLE_ENABLED is true',
    );
  console.log('Google OAuth ENABLED');
}

if (githubEnabled) {
  if (!process.env.GITHUB_CLIENT_ID)
    throw new Error('Missing GITHUB_CLIENT_ID because GITHUB_ENABLED is true');
  if (!process.env.GITHUB_CLIENT_SECRET)
    throw new Error(
      'Missing GITHUB_CLIENT_SECRET because GITHUB_ENABLED is true',
    );
  console.log('GitHub OAuth ENABLED');
}

if (linkedinEnabled) {
  if (!process.env.LINKEDIN_CLIENT_ID)
    throw new Error('Missing LINKEDIN_CLIENT_ID because LINKEDIN_ENABLED is true');
  if (!process.env.LINKEDIN_CLIENT_SECRET)
    throw new Error(
      'Missing LINKEDIN_CLIENT_SECRET because LINKEDIN_ENABLED is true',
    );
  console.log('LinkedIn OAuth ENABLED');
}

if (twitterEnabled) {
  if (!process.env.TWITTER_CLIENT_ID)
    throw new Error('Missing TWITTER_CLIENT_ID because TWITTER_ENABLED is true');
  if (!process.env.TWITTER_CLIENT_SECRET)
    throw new Error(
      'Missing TWITTER_CLIENT_SECRET because TWITTER_ENABLED is true',
    );
  console.log('Twitter OAuth ENABLED');
}

if (microsoftEnabled) {
  if (!process.env.MICROSOFT_CLIENT_ID)
    throw new Error('Missing MICROSOFT_CLIENT_ID because MICROSOFT_ENABLED is true');
  if (!process.env.MICROSOFT_CLIENT_SECRET)
    throw new Error(
      'Missing MICROSOFT_CLIENT_SECRET because MICROSOFT_ENABLED is true',
    );
  console.log('Microsoft OAuth ENABLED');
}

console.log('--- Checking env vars in lib/auth.ts ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'MISSING!');
console.log(
  'BETTER_AUTH_SECRET:',
  process.env.BETTER_AUTH_SECRET ? 'Set' : 'MISSING!',
);
console.log(
  'BETTER_AUTH_URL:',
  process.env.BETTER_AUTH_URL ? 'Set' : 'MISSING!',
);
console.log('-----------------------------------------\n'); // Added newline for clarity

let stripeClient: Stripe | undefined;
if (stripeEnabled) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is required when Stripe is enabled');
  }
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

const resend =
  emailVerificationEnabled && process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const plans = [
  {
    name: 'antwrite',
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  },
];

type HookUser = {
  id: string;
  email?: string | null;
};

const authPlugins: any[] = [];

if (stripeEnabled && stripeClient) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required when Stripe is enabled');
  }
  authPlugins.push(
    stripe({
      stripeClient: stripeClient,
      stripeWebhookSecret: stripeWebhookSecret,
    createCustomerOnSignUp: true,
    subscription: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      plans,
      requireEmailVerification: emailVerificationEnabled,
    },
  }),
);
}

authPlugins.push(nextCookies());

const socialProviders: Record<string, any> = {};

if (googleEnabled) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (clientId && clientSecret) {
    socialProviders.google = {
      clientId,
      clientSecret,
    };
  }
}

if (githubEnabled) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (clientId && clientSecret) {
    socialProviders.github = {
      clientId,
      clientSecret,
    };
  }
}

if (linkedinEnabled) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (clientId && clientSecret) {
    socialProviders.linkedin = {
      clientId,
      clientSecret,
    };
  }
}

if (twitterEnabled) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (clientId && clientSecret) {
    socialProviders.twitter = {
      clientId,
      clientSecret,
    };
  }
}

if (microsoftEnabled) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (clientId && clientSecret) {
    socialProviders.microsoft = {
      clientId,
      clientSecret,
    };
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  socialProviders,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailVerificationEnabled,
  },

  emailVerification: {
    sendOnSignUp: emailVerificationEnabled,
    sendVerificationEmail:
      emailVerificationEnabled && resend
        ? async (
            {
              user,
              url,
              token,
            }: { user: HookUser; url: string; token: string },
            request?: Request,
          ) => {
            if (!user.email) {
              console.error('Missing user email in sendVerificationEmail hook');
              return;
            }
            console.log(
              `Attempting to send verification email to ${user.email} via Resend...`,
            );
            console.log(`Verification URL: ${url}`);
            try {
              const emailFrom = process.env.EMAIL_FROM;
              if (!emailFrom) {
                throw new Error('EMAIL_FROM environment variable is required for email verification');
              }
              const { data, error } = await resend.emails.send({
                from: emailFrom,
                to: [user.email],
                subject: 'Verify your email for Antwrite',
                html: `<p>Welcome! Please click the link below to verify your email address:</p><p><a href="${url}">Verify Email</a></p><p>If the link doesn't work, copy and paste this URL into your browser: ${url}</p>`,
              });

              if (error) {
                console.error('Resend error:', error);
                throw new Error(
                  `Failed to send verification email: ${error.message}`,
                );
              }

              console.log(
                `Verification email sent successfully to ${user.email}. ID: ${data?.id}`,
              );
            } catch (err) {
              console.error('Failed to send verification email:', err);
            }
          }
        : undefined,
  },

  plugins: authPlugins,

  trustedOrigins: [
    'https://www.antwrite.com',
    ...(process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000']
      : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];

'use client';

import React, { useState } from 'react';
import { CardHeader, Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Crimson_Text } from 'next/font/google';
import {
    Dialog,
    DialogContent,
    DialogTitle
} from '@/components/ui/dialog';

const crimson = Crimson_Text({
    weight: ['400', '700'],
    subsets: ['latin'],
    display: 'swap',
});

// Environment variables for enabled providers
// Enable by default in development, or when explicitly set to 'true'
const isDev = process.env.NODE_ENV === 'development';
const googleEnabled =
    isDev || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
const githubEnabled =
    isDev || process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
const linkedinEnabled =
    isDev || process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === 'true';
const twitterEnabled =
    isDev || process.env.NEXT_PUBLIC_TWITTER_ENABLED === 'true';
const microsoftEnabled =
    isDev || process.env.NEXT_PUBLIC_MICROSOFT_ENABLED === 'true';

const StyleToggleDemo = ({ inView }: { inView: boolean }) => {
    const [isEnabled, setIsEnabled] = useState(false);

    return (
        <div className="rounded-sm border p-4 w-full">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Writer style</span>
                <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    className="scale-110"
                />
            </div>
        </div>
    );
};

type WelcomeModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const WelcomeModal = ({ open, onOpenChange }: WelcomeModalProps) => {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-6xl max-h-[75vh] overflow-y-auto select-none"
                data-welcome-modal
                showCloseButton={true}
            >
                <DialogTitle className="sr-only">Welcome to Antwrite</DialogTitle>
                <div className="relative min-h-screen overflow-hidden bg-background text-foreground p-0">
                    {/* Features Section with animations */}
                    <FeaturesSection />


                </div>

                <style jsx global>{`
          :root {
            --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
            --ease-out-cubic: cubic-bezier(0.215, 0.610, 0.355, 1.000);
            --ease-out-quart: cubic-bezier(0.165, 0.840, 0.440, 1.000);
          }
          .demo-prose-mirror-style {
            line-height: 1.6;
            min-height: 100px;
          }

          .demo-text-base {
            color: hsl(var(--foreground));
          }

          /* Inline Suggestion Animation - Streaming Effect */
          .demo-inline-suggestion-animated::after {
            content: attr(data-suggestion);
            color: var(--muted-foreground);
            opacity: 1;
            padding-left: 0.1em;
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            width: 0; /* Start with no width */
            vertical-align: bottom;
            animation: streamInSuggestion 1s steps(22, end) 1.2s forwards; /* 22 steps for " a helpful completion." */
          }

          @keyframes streamInSuggestion {
            to { width: 100%; } /* Animate to full width of the content */
          }

          /* Selection Overlay Animation & Enhanced Styling */
          .demo-selected-text-animated {
            animation: highlightText 0.6s 0.7s forwards var(--ease-out-quad);
            background-color: transparent;
            padding: 0.1em 0.2em;
            border-radius: 4px;
            display: inline; /* Or inline-block if needed for specific highlight styles */
          }
          @keyframes highlightText {
            0% { background-color: transparent; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            30% { background-color: rgba(59, 130, 246, 0.2); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);}
            100% { background-color: rgba(59, 130, 246, 0.2); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);}
          }
          .demo-suggestion-overlay-animated {
            position: absolute;
            bottom: -0.75rem; /* Position slightly below the card content bottom */
            left: 5%;
            right: 5%;
            background-color: hsl(var(--card));
            border-radius: 4px;
            padding: 0.625rem; /* Increased from 0.5rem */
            box-shadow: 0 6px 16px -2px rgba(0,0,0,0.1), 0 3px 8px -2px rgba(0,0,0,0.06);
            opacity: 0;
            transform: translateY(calc(100% + 1rem)) scale(0.98);
            animation: slideInOverlayEnhanced 0.6s 1.5s forwards var(--ease-out-quart); /* Delay to 1.5s */
            font-size: 0.875rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem; /* Increased from 0.375rem */
          }
          .demo-overlay-header {
            display: flex;
            align-items: center;
            padding: 0 0.125rem;
            gap: 0.375rem;
          }
          .demo-overlay-input-placeholder {
            width: 100%;
            padding: 0.375rem 0.625rem;
            border-radius: 4px;
            border: 1px solid hsl(var(--border));
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
            background-color: transparent;
            min-height: calc(0.75rem * 1.5 + 0.375rem * 2); /* Approx line height + padding */
            position: relative; /* For caret */
          }
          .demo-overlay-input-placeholder::before { /* Animated text */
            content: "";
            display: inline-block;
            animation: demoInputTyping 2s steps(22, end) 2.2s forwards; /* 22 steps for "Make it more punchy." */
            opacity: 0;
          }
          .demo-overlay-input-placeholder::after { /* Blinking caret */
            content: '|';
            display: inline-block;
            color: var(--foreground);
            animation: demoCaretAnimation 2s linear 2.2s forwards;
            opacity: 0;
            margin-left: 1px;
          }

          @keyframes demoInputTyping {
            0% { content: ""; opacity: 0;}
            1% { opacity: 1;}
            4.5% { content: "M"; }  9% { content: "Ma"; } 13.5% { content: "Mak"; } 18% { content: "Make"; }
            22.5% { content: "Make "; } 27% { content: "Make i"; } 31.5% { content: "Make it"; } 36% { content: "Make it "; }
            40.5% { content: "Make it m"; } 45% { content: "Make it mo"; } 49.5% { content: "Make it mor"; } 54% { content: "Make it more"; }
            58.5% { content: "Make it more "; } 63% { content: "Make it more p"; } 67.5% { content: "Make it more pu"; } 72% { content: "Make it more pun"; }
            76.5% { content: "Make it more punc"; } 81% { content: "Make it more punch"; } 85.5% { content: "Make it more punchy"; }
            90% { content: "Make it more punchy."; }
            100% { content: "Make it more punchy."; opacity: 1; }
          }

          @keyframes demoCaretAnimation { /* Controls both visibility and blinking */
            0%, 100% { opacity: 0; } /* Ends hidden */
            1% { opacity: 1; } /* Visible when typing starts */
            /* Blinking effect */
            5%, 15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%, 95% { opacity: 1; }
            10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90% { opacity: 0; }
          }

          .demo-overlay-diff-view {
            border: 1px solid hsl(var(--border));
            border-radius: 4px;
            padding: 0.5rem;
            font-size: 0.75rem;
            background-color: var(--muted-background-subtle, rgba(0,0,0,0.015));
            min-height: 32px;
            opacity: 0; /* Initially hidden */
            animation: fadeInDiffView 0.3s ease-out 4.3s forwards; /* Fade in after input typing */
          }

          @keyframes fadeInDiffView {
            to { opacity: 1; }
          }

          .demo-diff-new-text-animated {
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            width: 0; /* Start with no width */
            vertical-align: bottom;
            animation: streamInDiffNewText 1s steps(22, end) 4.7s forwards; /* Stream in after diff view fades in */
          }

          @keyframes streamInDiffNewText {
            to { width: max-content; } /* Ensure it takes the full width of its text content */
          }

          html.dark .demo-overlay-diff-view {
              background-color: var(--muted-background-subtle, rgba(255,255,255,0.02));
          }
          .demo-overlay-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.25rem;
            padding-top: 0.5rem; /* Increased padding */
            border-top: 1px solid hsl(var(--border));
          }

          @keyframes slideInOverlayEnhanced {
            from { opacity: 0; transform: translateY(calc(100% + 1rem)) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          /* Synonym Plugin Animation */
          .demo-synonym-word-animated {
            display: inline-block;
            position: relative;
            cursor: default;
            margin-left: 0.25em; /* Added for spacing */
            margin-right: 0.25em; /* Added for spacing */
          }
          .demo-synonym-word-animated::before {
            content: '';
            position: absolute;
            top: -2px; left: -2px; right: -2px; bottom: -2px;
            background-color: transparent;
            border-radius: 4px;
            pointer-events: none;
            animation: synonymLoadingState 0.7s 0.7s forwards var(--ease-out-quad); /* Delay 0.7s */
          }
          @keyframes synonymLoadingState {
            0% { text-decoration: none; background-color: transparent; }
            40%, 60%, 100% { text-decoration: underline dotted var(--muted-foreground); background-color: rgba(100, 100, 100, 0.07); }
          }

          .demo-synonym-menu-animated {
            position: absolute;
            left: 50%;
            bottom: 135%;
            background-color: hsl(var(--popover));
            color: hsl(var(--popover-foreground));
            border: 1px solid hsl(var(--border));
            border-radius: 4px;
            padding: 7px 9px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            display: flex;
            gap: 7px;
            font-size: 0.75rem;
            z-index: 10;
            opacity: 0;
            white-space: nowrap;
            transform: translateX(-50%) translateY(8px) scale(0.95);
            animation: fadeInSynonymMenu 0.5s 1.6s forwards var(--ease-out-cubic);
          }
          .demo-synonym-menu-animated span {
            padding: 4px 6px;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.2s;
          }
          .demo-synonym-menu-animated span:hover {
            background-color: hsl(var(--accent));
            color: hsl(var(--accent-foreground));
          }
          @keyframes fadeInSynonymMenu {
            from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); }
            to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          }

          html.dark .demo-overlay-input-placeholder {
              /* border: 1px solid var(--input-border, #374151); Fallback already uses CSS var, explicit now */
              /* color: var(--muted-foreground, #9ca3af); Fallback already uses CSS var, explicit now */
           }

          /* Metallic macOS style frame for hero image */
          .hero-frame {
            border: 8px solid #c0c0c0;
            border-radius: 4px;
            background: linear-gradient(145deg, #e0e0e0, #f9f9f9);
            padding: 4px;
          }
          html.dark .hero-frame {
            background: linear-gradient(145deg, #1f1f1f, #2c2c2c);
            border-color: #555555;
          }

          /* Initial state: no demo CSS animations until in-view */
          #features .demo-inline-suggestion-animated::after,
          #features .demo-selected-text-animated,
          #features .demo-suggestion-overlay-animated,
          #features .demo-overlay-input-placeholder::before,
          #features .demo-overlay-input-placeholder::after,
          #features .demo-overlay-diff-view,
          #features .demo-diff-new-text-animated,
          #features .demo-synonym-word-animated::before,
          #features .demo-synonym-menu-animated {
            animation: none;
          }
          /* Play animations once when features section enters viewport via Framer Motion useInView */
          #features.in-view .demo-inline-suggestion-animated::after {
            animation: streamInSuggestion 1s steps(22, end) 1.2s forwards;
          }
          #features.in-view .demo-selected-text-animated {
            animation: highlightText 0.6s 0.7s forwards var(--ease-out-quad);
          }
          #features.in-view .demo-suggestion-overlay-animated {
            animation: slideInOverlayEnhanced 0.6s 1.5s forwards var(--ease-out-quart);
          }
          #features.in-view .demo-overlay-input-placeholder::before {
            animation: demoInputTyping 2s steps(22, end) 2.2s forwards;
          }
          #features.in-view .demo-overlay-input-placeholder::after {
            animation: demoCaretAnimation 2s linear 2.2s forwards;
          }
          #features.in-view .demo-overlay-diff-view {
            animation: fadeInDiffView 0.3s ease-out 4.3s forwards;
          }
          #features.in-view .demo-diff-new-text-animated {
            animation: streamInDiffNewText 1s steps(22, end) 4.7s forwards;
          }
          #features.in-view .demo-synonym-word-animated::before {
            animation: synonymLoadingState 0.7s 0.7s forwards var(--ease-out-quad);
          }
          #features.in-view .demo-synonym-menu-animated {
            animation: fadeInSynonymMenu 0.5s 1.6s forwards var(--ease-out-cubic);
          }

          /* Ensure feature cards have no extra hover effects */
          #features .rounded-sm:hover {
            box-shadow: var(--tw-shadow, 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)); /* Explicitly set to base shadow if using Tailwind's 'shadow' class */
            transform: none;
          }

          /* Synonym menu styling enhancements */
          .demo-synonym-menu-animated {
            z-index: 20; /* Ensure above other content */
            box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid hsl(var(--border));
          }

          /* On mobile, position synonyms menu below the word so it never clips off-screen */
          @media (max-width: 768px) {
            .demo-synonym-menu-animated {
              bottom: auto !important;
              top: 100% !important;
              transform: translateX(-50%) translateY(4px) scale(1) !important;
              margin-top: 0.25rem;
            }
          }

          /* Inline Suggestion 3D Tab Key Styling */
          .inline-suggestion-wrapper {
            display: inline-flex;
            align-items: baseline;
            gap: 0.25rem;
          }
          .inline-tab-icon {
            background: linear-gradient(145deg, #f3f3f3, #e0e0e0);
            border: 1px solid #c0c0c0;
            border-radius: 4px;
            padding: 0.15em 0.5em;
            font-size: 0.75em;
            font-weight: 500;
            color: hsl(var(--muted-foreground));
            box-shadow: 0 2px 0 rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8);
            opacity: 0;
            animation: fadeInInlineTab 0.3s ease-out 1.3s forwards;
          }
          @keyframes fadeInInlineTab {
            to { opacity: 1; }
          }
          html.dark .inline-tab-icon {
            background: linear-gradient(145deg, #2c2c2c, #1f1f1f);
            border-color: #444444;
            box-shadow: 0 2px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
            color: hsl(var(--muted-foreground));
          }
        `}</style>
            </DialogContent>
        </Dialog>
    );
};

// Features Section Component
const FeaturesSection = () => {
    const featuresRef = React.useRef<HTMLElement>(null);
    const isFeaturesInView = useInView(featuresRef, { once: true, amount: 0.3 });
    const card1Ref = React.useRef<HTMLDivElement>(null);
    const card2Ref = React.useRef<HTMLDivElement>(null);
    const card3Ref = React.useRef<HTMLDivElement>(null);
    const card4Ref = React.useRef<HTMLDivElement>(null);
    const card5Ref = React.useRef<HTMLDivElement>(null);
    const card6Ref = React.useRef<HTMLDivElement>(null);
    const card1InView = useInView(card1Ref, { once: true, amount: 0.5 });
    const card2InView = useInView(card2Ref, { once: true, amount: 0.5 });
    const card3InView = useInView(card3Ref, { once: true, amount: 0.5 });
    const card4InView = useInView(card4Ref, { once: true, amount: 0.5 });
    const card5InView = useInView(card5Ref, { once: true, amount: 0.5 });
    const card6InView = useInView(card6Ref, { once: true, amount: 0.5 });

    const modelNames = ['Llama', 'Kimi', 'Deepseek', 'Claude'] as const;
    const proIndex = 3;

    return (
        <section
            id="features"
            ref={featuresRef}
            aria-labelledby="features-heading"
            className={`py-10 ${isFeaturesInView ? 'in-view' : ''}`}
        >
            <div className="container mx-auto px-6 md:px-8 lg:px-12">
                <div className="text-center mb-14">
                    <h2
                        id="features-heading"
                        className={`text-4xl md:text-5xl font-medium ${crimson.className} tracking-tight text-foreground`}
                    >
                        Step into Wonder...
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Card 1: Inline Suggestion Demo */}
                    <motion.div
                        ref={card1Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card1InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm overflow-visible">
                            <CardHeader className="p-6 text-base font-medium">
                                Smart suggestions

                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow">
                                <p className="demo-prose-mirror-style">
                                    <span className="demo-text-base">
                                        You start typing, and the AI offers
                                    </span>
                                    <span className="inline-suggestion-wrapper">
                                        <span
                                            className="demo-inline-suggestion-animated"
                                            data-suggestion=" a helpful completion."
                                        />
                                        <kbd className="inline-tab-icon">Tab</kbd>
                                    </span>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card 2: Suggestion Overlay Demo */}
                    <motion.div
                        ref={card2Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card2InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm overflow-visible">
                            <CardHeader className="p-6 text-base font-medium">
                                Quick fixes
                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow relative overflow-visible">
                                <p className="demo-prose-mirror-style">
                                    <span className="demo-text-base">
                                        This phrasing{' '}
                                        <span className="demo-selected-text-animated">
                                            is a bit weak and verbose.
                                        </span>{' '}
                                        Let&apos;s ask the AI to improve it.
                                    </span>
                                </p>
                                <div className="demo-suggestion-overlay-animated border border-border">
                                    <div className="demo-overlay-header">
                                        <GripVertical
                                            size={14}
                                            className="text-muted-foreground/70 demo-overlay-drag-handle"
                                        />
                                        <h3 className="text-xs font-medium">Suggestion</h3>
                                    </div>
                                    <div className="demo-overlay-input-placeholder" />
                                    <div className="demo-overlay-diff-view">
                                        <span className="text-red-500 line-through dark:text-red-400/70">
                                            is a bit weak and verbose.
                                        </span>
                                        <span className="text-green-600 dark:text-green-400/70 ml-1 demo-diff-new-text-animated">
                                            lacks punch and impact.
                                        </span>
                                    </div>
                                    <div className="demo-overlay-actions">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 py-1 text-xs hover:text-destructive rounded-sm bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-800 dark:hover:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors duration-200"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 py-1 text-xs hover:text-primary rounded-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800 transition-colors duration-200"
                                        >
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card 3: Smart Synonyms Demo */}
                    <motion.div
                        ref={card3Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card3InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm overflow-visible">
                            <CardHeader className="p-6 text-base font-medium">
                                Instant synonym finder
                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow">
                                <p className="demo-prose-mirror-style relative">
                                    <span className="demo-text-base">
                                        Find better words with ease. The AI presents contextually
                                    </span>
                                    <span
                                        className="demo-synonym-word-animated"
                                        data-word="relevant"
                                    >
                                        relevant
                                        <span className="demo-synonym-menu-animated">
                                            <span>apt</span>
                                            <span>pertinent</span>
                                            <span>fitting</span>
                                        </span>
                                    </span>
                                    <span className="demo-text-base"> synonyms.</span>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card 4: AI Writing That Sounds Like You */}
                    <motion.div
                        ref={card4Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card4InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm overflow-visible">
                            <CardHeader className="p-6 text-base font-medium">
                                Write better with AI
                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow flex flex-col justify-between items-center">
                                <div className="w-full flex flex-col items-center grow justify-center">
                                    <StyleToggleDemo inView={card4InView} />
                                </div>
                                <p className="text-center w-full mt-8">
                                    Trained on your writing to apply your unique style.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card 5: Access Premium Models */}
                    <motion.div
                        ref={card5Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card5InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.25 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm">
                            <CardHeader className="p-6 text-base font-medium">
                                Access the most powerful models
                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow flex flex-col justify-between items-center">
                                <div
                                    className="w-full flex items-center justify-center gap-0"
                                    style={{ height: '112px' }}
                                >
                                    {modelNames.map((name, i) => {
                                        const mid = (modelNames.length - 1) / 2;
                                        const offset = i - mid;
                                        const rot = offset * 8;
                                        const y = Math.abs(offset) * 8;
                                        return (
                                            <motion.div
                                                key={name}
                                                initial={{ opacity: 0, rotate: 0, y: 0 }}
                                                animate={
                                                    card5InView
                                                        ? {
                                                            opacity: 1,
                                                            rotate: rot,
                                                            y,
                                                            transition: {
                                                                delay: 0.2 + i * 0.1,
                                                                type: 'spring',
                                                                stiffness: 140,
                                                                damping: 15,
                                                            },
                                                        }
                                                        : {}
                                                }
                                                className="w-20 h-28 bg-background border border-border rounded-sm flex items-center justify-center mx-[-4px] shadow-sm relative"
                                                style={{ zIndex: 10 - Math.abs(offset) }}
                                            >
                                                {i === proIndex && (
                                                    <span className="absolute top-1 right-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] px-1 rounded-sm border border-green-200 dark:border-green-800">
                                                        Pro
                                                    </span>
                                                )}
                                                <span className="text-xs font-medium">{name}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                                <p className="text-sm text-muted-foreground text-center w-full mt-8">
                                    Unlimited, free access to the best AI models.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card 6: One-Click Publish & Share */}
                    <motion.div
                        ref={card6Ref}
                        initial={{ opacity: 0, y: 20 }}
                        animate={card6InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="size-full"
                    >
                        <Card className="h-full flex flex-col min-h-[320px] rounded-sm">
                            <CardHeader className="p-6 text-base font-medium">
                                Publish and share
                            </CardHeader>
                            <CardContent className="p-6 text-sm text-muted-foreground grow flex flex-col justify-between items-center">
                                <div className="w-full flex flex-col items-center">
                                    {/* Mini page preview */}
                                    <div className="relative w-44 h-32 rounded-sm border border-border bg-background shadow-sm overflow-hidden">
                                        {/* URL bar */}
                                        <div className="h-5 bg-muted flex items-center px-2 text-[9px] text-muted-foreground/90 font-mono gap-1">
                                            <span className="truncate">you/your-post</span>
                                        </div>
                                        {/* Content preview */}
                                        <div className="p-3 space-y-1">
                                            <div className="h-2.5 bg-muted rounded-sm w-2/3" />
                                            <div className="h-2.5 bg-muted rounded-sm w-full" />
                                            <div className="h-2.5 bg-muted rounded-sm w-5/6" />
                                        </div>
                                        {/* Chat bubble */}
                                        <div className="absolute bottom-2 right-2 w-8 h-4 rounded-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center justify-center text-[6px] shadow transition-colors duration-200">
                                            Ask
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground text-center w-full mt-8">
                                    Publish in one click & share with AI chat support.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

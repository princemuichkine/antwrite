'use client';

import type { Attachment, ChatRequestOptions, Message } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
  useLayoutEffect,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { sanitizeUIMessages, cn } from '@/lib/utils';
import { ArrowUpIcon, StopIcon, FileIcon, CrossIcon } from '../icons';
import { Button } from '../ui/button';
import { SuggestedActions } from '../suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useDocumentContext } from '@/hooks/use-document-context';

import { Badge } from '../ui/badge';
import { ContextSelector, type ContextItem } from '../context-selector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { ModelSelector } from './model-selector';
import { ChatModeSelector, type ChatMode } from './chat-mode-selector';

export interface MentionedDocument {
  id: string;
  title: string;
}



function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  confirmedMentions,
  onMentionsChange,
  selectedModelId,
  onModelChange,
  chatMode,
  onChatModeChange,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  confirmedMentions: MentionedDocument[];
  onMentionsChange: (mentions: MentionedDocument[]) => void;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowSize();
  const { documentId: activeDocumentId, documentTitle: activeDocumentTitle } =
    useDocumentContext();
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const atButtonContainerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [visibleMentionsLimit, setVisibleMentionsLimit] = useState(4);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  useLayoutEffect(() => {
    const badgesContainer = badgesContainerRef.current;
    const atButtonContainer = atButtonContainerRef.current;
    const measurementContainer = measurementRef.current;

    if (!badgesContainer || !atButtonContainer || !measurementContainer) {
      return;
    }

    const calculateLimit = () => {
      const containerWidth = badgesContainer.offsetWidth;
      const atButtonWidth = atButtonContainer.offsetWidth;
      const badgeNodes = Array.from(
        measurementContainer.children,
      ) as HTMLElement[];
      const totalMentions = badgeNodes.length;

      const GAP = 6; // Corresponds to gap-1.5
      const PLUS_X_BADGE_WIDTH = 40;

      let currentWidth = atButtonWidth;
      let newLimit = 0;

      for (let i = 0; i < totalMentions; i++) {
        const badgeWidth = badgeNodes[i].offsetWidth;
        const widthWithNextBadge = currentWidth + GAP + badgeWidth;

        const hasMoreBadges = i < totalMentions - 1;

        let requiredWidth = widthWithNextBadge;
        if (hasMoreBadges) {
          requiredWidth += GAP + PLUS_X_BADGE_WIDTH;
        }

        if (requiredWidth > containerWidth) {
          newLimit = i;
          break;
        } else {
          currentWidth = widthWithNextBadge;
          newLimit = i + 1;
        }
      }

      setVisibleMentionsLimit(newLimit);
    };

    calculateLimit();

    const resizeObserver = new ResizeObserver(calculateLimit);
    resizeObserver.observe(badgesContainer);

    return () => resizeObserver.disconnect();
  }, [confirmedMentions]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;

    if (!textarea || !overlay) {
      return;
    }

    const handleScroll = () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', handleScroll);

    return () => {
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const [showMentionContextSelector, setShowMentionContextSelector] = useState(false);
  const [showAddContextSelector, setShowAddContextSelector] = useState(false);
  const [addSelectorPosition, setAddSelectorPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [mentionStartPosition, setMentionStartPosition] = useState<number>(-1);
  const [mentionSelectorPosition, setMentionSelectorPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [mentionQuery, setMentionQuery] = useState('');

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );
  useEffect(() => {
    const initialVal = localStorageInput || '';
    setInput(initialVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hiddenMentionsCount =
    confirmedMentions.length > visibleMentionsLimit
      ? confirmedMentions.length - visibleMentionsLimit
      : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    setLocalStorageInput(newValue);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.substring(atIndex + 1);
      // Show context selector immediately when @ is typed, even with no text after it
      if (!afterAt.includes(' ')) {
        setMentionStartPosition(atIndex);
        setMentionQuery(afterAt);

        // Calculate position for context selector
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();

          // Create a mirror div to calculate character position
          const mirrorDiv = document.createElement('div');
          const style = window.getComputedStyle(textarea);

          mirrorDiv.style.position = 'absolute';
          mirrorDiv.style.visibility = 'hidden';
          mirrorDiv.style.whiteSpace = 'pre-wrap';
          mirrorDiv.style.wordWrap = 'break-word';
          mirrorDiv.style.width = `${textarea.clientWidth}px`;
          mirrorDiv.style.font = style.font;
          mirrorDiv.style.padding = style.padding;
          mirrorDiv.style.border = style.border;
          mirrorDiv.style.boxSizing = style.boxSizing;

          const textBeforeAt = newValue.substring(0, atIndex);
          mirrorDiv.textContent = textBeforeAt;

          const atSpan = document.createElement('span');
          atSpan.textContent = '@';
          mirrorDiv.appendChild(atSpan);

          document.body.appendChild(mirrorDiv);

          const atSpanTopRelativeToTextarea = atSpan.offsetTop - textarea.scrollTop;
          const atSpanLeftRelativeToTextarea = atSpan.offsetLeft - textarea.scrollLeft;

          const selectorX = rect.left + atSpanLeftRelativeToTextarea;
          const selectorY = rect.top + atSpanTopRelativeToTextarea - 2; // 2px margin from bottom

          document.body.removeChild(mirrorDiv);

          setMentionSelectorPosition({ x: selectorX, y: selectorY });
        }

        setShowMentionContextSelector(true);
        setShowAddContextSelector(false); // Close add context selector if open
      } else {
        setShowMentionContextSelector(false);
        setMentionStartPosition(-1);
        setMentionSelectorPosition(undefined);
      }
    } else {
      setShowMentionContextSelector(false);
      setMentionStartPosition(-1);
      setMentionSelectorPosition(undefined);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    const contextData: {
      activeDocumentId?: string;
      mentionedDocumentIds?: string[];
    } = {};

    if (activeDocumentId && activeDocumentId !== 'init') {
      contextData.activeDocumentId = activeDocumentId;
    }
    if (confirmedMentions.length > 0) {
      contextData.mentionedDocumentIds = confirmedMentions.map((doc) => doc.id);
    }

    const options: ChatRequestOptions = {
      experimental_attachments: attachments,
      data: contextData,
    };

    handleSubmit(undefined, options);

    setAttachments([]);
    setInput('');
    setLocalStorageInput('');
    onMentionsChange([]); // Clear confirmed mentions in parent

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    activeDocumentId,
    confirmedMentions,
    handleSubmit,
    setAttachments,
    setInput,
    setLocalStorageInput,
    width,
    onMentionsChange,
  ]);

  // Handle context item selection
  const handleContextSelect = (item: ContextItem) => {
    const currentValue = input;
    const beforeMention = currentValue.substring(0, mentionStartPosition);
    const afterCursor = currentValue.substring(textareaRef.current?.selectionStart || mentionStartPosition + 1);

    // Insert the @item text in the input AND add it as a badge
    const newValue = `${beforeMention}@${item.title} ${afterCursor}`;
    setInput(newValue);
    setLocalStorageInput(newValue);

    // Add to confirmed mentions (for now, only documents)
    if (item.type === 'document') {
      const newMentions = [...confirmedMentions];
      const existingIndex = newMentions.findIndex(m => m.id === item.id);
      if (existingIndex === -1) {
        newMentions.push({ id: item.id, title: item.title });
      }
      onMentionsChange(newMentions);
    }

    setShowMentionContextSelector(false);
    setMentionStartPosition(-1);

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPosition = beforeMention.length + item.title.length + 2; // +2 for @ and space
      textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  // Handle Add Context button click
  const handleAddContextClick = () => {
    setMentionStartPosition(input.length);
    setShowAddContextSelector(true);
    setShowMentionContextSelector(false); // Close mention selector if open

    if (atButtonContainerRef.current) {
      const rect = atButtonContainerRef.current.getBoundingClientRect();
      setAddSelectorPosition({ x: rect.left, y: rect.top - 4 }); // Position with margin
    }

    // Focus the textarea after a brief delay
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Upload logic
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (status === 'ready' && input.trim() !== '') {
        submitForm();
      } else if (status !== 'ready') {
        toast.error('Please wait for the model to finish its response!');
      }
    }

    // Handle escape to close context selectors
    if (event.key === 'Escape' && (showMentionContextSelector || showAddContextSelector)) {
      setShowMentionContextSelector(false);
      setShowAddContextSelector(false);
      setMentionStartPosition(-1);
      setMentionSelectorPosition(undefined);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        confirmedMentions.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}
      <div
        ref={measurementRef}
        className="absolute top-0 left-0 -z-10 flex flex-nowrap items-center gap-1.5 invisible"
      >
        {confirmedMentions.map((doc) => (
          <Badge
            key={doc.id}
            variant="secondary"
            className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 text-xs group bg-background/30 border border-border/30 text-muted-foreground"
          >
            <FileIcon size={12} className="text-accent-foreground" />
            <span className="max-w-[120px] truncate">{doc.title}</span>
          </Badge>
        ))}
      </div>
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* New Composer Wrapper */}
      <div className="relative flex flex-col w-full rounded-sm border border-border/50 bg-muted focus-within:ring-1 focus-within:ring-ring/50 focus-within:border-border transition-colors">
        {/* Top bar with context button and badges */}
        <div
          ref={badgesContainerRef}
          className="flex items-center gap-1.5 px-2 py-1 flex-nowrap overflow-hidden border-b border-border/50"
        >
          <div ref={atButtonContainerRef} className="relative">
            <button
              type="button"
              onClick={handleAddContextClick}
              className={cn(
                "add-context-button flex items-center gap-1 text-xs text-accent-foreground bg-background/30 hover:bg-accent/30 transition-colors rounded-sm border border-border/30 opacity-60 hover:opacity-100 h-6",
                confirmedMentions.length > 0 ? 'px-1.5' : 'px-2'
              )}
            >
              <span className="text-base leading-none">@</span>
              {confirmedMentions.length === 0 && <span>Add context</span>}
            </button>
          </div>
          <TooltipProvider>
            {confirmedMentions.slice(0, visibleMentionsLimit).map((doc) => (
              <Tooltip key={doc.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1.5 pl-1.5 pr-2 text-xs group bg-background/30 hover:bg-accent/30 border border-border/30 text-accent-foreground opacity-60 hover:opacity-100 h-6"
                  >
                    <button
                      type="button"
                      className="flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newMentions = confirmedMentions.filter(
                          (m) => m.id !== doc.id,
                        );
                        onMentionsChange(newMentions);
                        const currentValue = input;
                        const mentionText = `@${doc.title}`;
                        const newValue = currentValue
                          .replace(mentionText, '')
                          .trim();
                        setInput(newValue);
                        setLocalStorageInput(newValue);
                      }}
                      aria-label={`Remove ${doc.title} mention`}
                    >
                      <FileIcon
                        size={12}
                        className="block group-hover:hidden text-accent-foreground"
                      />
                      <CrossIcon
                        size={12}
                        className="hidden group-hover:block"
                      />
                    </button>
                    <span className="max-w-[120px] truncate">
                      {doc.title}
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{doc.title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {hiddenMentionsCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2 text-xs group bg-background/30 hover:bg-accent/30 border border-border/30 text-accent-foreground opacity-60 hover:opacity-100 h-6"
                  >
                    +{hiddenMentionsCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {confirmedMentions.slice(visibleMentionsLimit).map((doc) => (
                    <p key={doc.id}>{doc.title}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        <div className="flex-1 p-3 space-y-2 relative">
          <div className="relative mention-input">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                // Handle backspace for @mentions
                if (e.key === 'Backspace') {
                  const cursorPosition = textareaRef.current?.selectionStart || 0;
                  const textBeforeCursor = input.substring(0, cursorPosition);

                  if (cursorPosition > 0) {
                    const atIndex = textBeforeCursor.lastIndexOf('@');
                    if (atIndex !== -1) {
                      const potentialMentionText = textBeforeCursor.substring(atIndex);
                      // Check if the text from the last @ to the cursor is a confirmed mention
                      const isConfirmedMention = confirmedMentions.some(
                        (m) => `@${m.title}` === potentialMentionText
                      );

                      if (isConfirmedMention) {
                        e.preventDefault();

                        const textAfterCursor = input.substring(cursorPosition);
                        // Remove the entire @mention
                        const newValue = textBeforeCursor.substring(0, atIndex) + textAfterCursor;
                        setInput(newValue);
                        setLocalStorageInput(newValue);

                        // Update cursor position
                        setTimeout(() => {
                          textareaRef.current?.setSelectionRange(atIndex, atIndex);
                        }, 0);

                        // Update confirmed mentions list
                        const updatedMentions = confirmedMentions.filter(
                          (m) => `@${m.title}` !== potentialMentionText
                        );
                        onMentionsChange(updatedMentions);
                        return;
                      }
                    }
                  }
                }

                // Call the original handleKeyDown for other keys like Enter, Escape
                handleKeyDown(e);
              }}
              placeholder="Ask, learn, write anything..."
              className={cn(
                'flex min-h-[80px] max-h-[350px] w-full bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-auto relative z-10 mention-textarea text-transparent caret-black dark:caret-white',
                className
              )}
              rows={1}
            />

            <div
              ref={overlayRef}
              className="hide-scrollbar absolute inset-0 p-0 text-sm pointer-events-none z-20 bg-transparent overflow-auto"
              style={{
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.25rem',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word'
              }}
            >
              {(() => {
                if (confirmedMentions.length === 0) {
                  return <span className="text-foreground">{input}</span>;
                }

                const escapeRegex = (str: string) =>
                  str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

                const mentionTitles = confirmedMentions.map((m) =>
                  escapeRegex(m.title),
                );
                // Sort by length descending to match longer titles first
                mentionTitles.sort((a, b) => b.length - a.length);

                const regex = new RegExp(
                  `(${mentionTitles.map((t) => `@${t}`).join('|')})`,
                  'g',
                );

                const parts = input.split(regex);

                return parts.map((part, index) => {
                  if (part.startsWith('@')) {
                    const mentionTitle = part.slice(1);
                    const isConfirmed = confirmedMentions.some(
                      (m) => m.title === mentionTitle,
                    );
                    if (isConfirmed) {
                      return (
                        <span key={index} className="mention-tag">
                          {part}
                        </span>
                      );
                    }
                  }
                  return (
                    <span key={index} className="text-foreground">
                      {part}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 z-30 w-fit flex flex-row justify-end">
            {status === 'submitted' ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton
                input={input}
                submitForm={submitForm}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
          <div className="absolute bottom-3 left-3 z-30 w-fit flex flex-row items-center gap-2">
            <ChatModeSelector
              selectedMode={chatMode}
              onModeChange={onChatModeChange}
            />
            <ModelSelector
              selectedModelId={selectedModelId}
              onModelChange={onModelChange}
              minimal={true}
            />
          </div>
        </div>
      </div>


      {/* Add Context Selector */}
      <ContextSelector
        isOpen={showAddContextSelector}
        onClose={() => {
          setShowAddContextSelector(false);
          setMentionStartPosition(-1);
          setAddSelectorPosition(undefined);
        }}
        onSelect={handleContextSelect}
        position={addSelectorPosition}
      />

      {/* Mention Context Selector */}
      <ContextSelector
        isOpen={showMentionContextSelector}
        onClose={() => {
          setShowMentionContextSelector(false);
          setMentionStartPosition(-1);
          setMentionSelectorPosition(undefined);
        }}
        onSelect={handleContextSelect}
        position={mentionSelectorPosition}
        shouldFocusSearchInput={false}
        showSearchBar={false}
        searchQueryValue={mentionQuery}
      />
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (!equal(prevProps.confirmedMentions, nextProps.confirmedMentions))
      return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
    if (prevProps.chatMode !== nextProps.chatMode) return false;
    return true;
  },
);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-sm p-1.5 h-fit bg-white hover:bg-neutral-200 dark:bg-neutral-100 dark:hover:bg-neutral-300 text-black"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  const hasText = input.trim().length > 0;
  const isDisabled = input.trim().length === 0 || uploadQueue.length > 0;

  return (
    <Button
      data-testid="send-button"
      className={cn(
        "rounded-sm p-1.5 h-fit transition-colors duration-200",
        hasText
          ? "bg-white hover:bg-neutral-200 dark:bg-neutral-100 dark:hover:bg-neutral-300 text-black"
          : "bg-background/30 hover:bg-accent/30 border border-border/30 text-accent-foreground opacity-60 hover:opacity-100",
        isDisabled && "opacity-50"
      )}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={isDisabled}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

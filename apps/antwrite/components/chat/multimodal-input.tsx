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
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { sanitizeUIMessages, cn } from '@/lib/utils';
import { ArrowUpIcon, StopIcon } from '../icons';
import { Button } from '../ui/button';
import { SuggestedActions } from '../suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useDocumentContext } from '@/hooks/use-document-context';

import { Badge } from '../ui/badge';
import { ContextSelector, type ContextItem } from '../context-selector';

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
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const { documentId: activeDocumentId, documentTitle: activeDocumentTitle } =
    useDocumentContext();

  const [showMentionContextSelector, setShowMentionContextSelector] = useState(false);
  const [showAddContextSelector, setShowAddContextSelector] = useState(false);
  const [mentionStartPosition, setMentionStartPosition] = useState<number>(-1);
  const [mentionSelectorPosition, setMentionSelectorPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );
  useEffect(() => {
    const initialVal = localStorageInput || '';
    setInput(initialVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



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

        // Calculate position for context selector
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();

          // Create a temporary element to measure text position
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.whiteSpace = 'pre-wrap';
          tempDiv.style.font = getComputedStyle(textarea).font;
          tempDiv.style.width = textarea.clientWidth + 'px';
          tempDiv.style.padding = getComputedStyle(textarea).padding;
          tempDiv.textContent = textBeforeCursor;

          document.body.appendChild(tempDiv);
          const textHeight = tempDiv.scrollHeight;
          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
          const lines = Math.floor(textHeight / lineHeight);
          document.body.removeChild(tempDiv);

          const selectorY = rect.top - 200; // Position above the current line
          const selectorX = rect.left + 20; // Small offset from left edge

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

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <div className="relative">
        {/* Document Mentions as Badges */}
        {confirmedMentions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {confirmedMentions.map((doc) => (
              <Badge
                key={doc.id}
                variant="secondary"
                className="text-xs px-2 py-1 hover:bg-secondary/80 group relative"
              >
                {doc.title}
                <button
                  className="absolute top-0.5 left-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground focus:opacity-100 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();

                    // Remove from confirmed mentions
                    const newMentions = confirmedMentions.filter(m => m.id !== doc.id);
                    onMentionsChange(newMentions);

                    // Also remove from text input
                    const currentValue = input;
                    const mentionText = `@${doc.title}`;
                    const newValue = currentValue.replace(mentionText, '').trim();
                    setInput(newValue);
                    setLocalStorageInput(newValue);
                  }}
                  aria-label={`Remove ${doc.title} mention`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Context Button */}
        <div className="mb-2 relative">
          <button
            type="button"
            onClick={handleAddContextClick}
            className="add-context-button flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background hover:bg-accent rounded-sm border border-border/50"
          >
            <span>@</span>
            <span>Add context</span>
          </button>

          {/* Add Context Button Context Selector */}
          <ContextSelector
            isOpen={showAddContextSelector}
            onClose={() => {
              setShowAddContextSelector(false);
              setMentionStartPosition(-1);
            }}
            onSelect={handleContextSelect}
            className="absolute bottom-full left-0 z-50 mb-1"
          />
        </div>

        <div className="relative mention-input">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              // Handle backspace/delete for @mentions
              if (e.key === 'Backspace' || e.key === 'Delete') {
                const cursorPosition = textareaRef.current?.selectionStart || 0;
                const textBeforeCursor = input.substring(0, cursorPosition);
                const textAfterCursor = input.substring(cursorPosition);

                // Check if we're inside or at the boundary of an @mention
                const atIndex = textBeforeCursor.lastIndexOf('@');
                if (atIndex !== -1) {
                  const afterAt = textBeforeCursor.substring(atIndex);
                  const mentionMatch = afterAt.match(/^@[^@\s]+/);

                  if (mentionMatch && (e.key === 'Backspace' || e.key === 'Delete')) {
                    e.preventDefault();

                    // Remove the entire @mention
                    const newValue = textBeforeCursor.substring(0, atIndex) + textAfterCursor;
                    setInput(newValue);
                    setLocalStorageInput(newValue);

                    // Update cursor position
                    setTimeout(() => {
                      textareaRef.current?.setSelectionRange(atIndex, atIndex);
                    }, 0);

                    // Update mentions
                    const mentionText = mentionMatch[0];
                    const updatedMentions = confirmedMentions.filter(m => `@${m.title}` !== mentionText);
                    onMentionsChange(updatedMentions);
                    return;
                  }
                }
              }

              // Call the original handleKeyDown
              handleKeyDown(e);
            }}
            placeholder="Ask, learn, write anything... (@ to mention documents, / to use tools)"
            className={cn(
              "flex min-h-[120px] w-full rounded-sm border border-border/50 bg-muted px-3 py-5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:border-border disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors overflow-hidden relative z-10 mention-textarea",
              className
            )}
            rows={1}
          />

          {/* Overlay for styled @mentions */}
          <div
            className="absolute inset-0 px-3 py-5 text-sm pointer-events-none z-20 bg-transparent"
            style={{
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.25rem',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word'
            }}
          >
            {input.split(/(@\w+)/g).map((part, index) => {
              if (part.startsWith('@')) {
                const mentionTitle = part.slice(1);
                const isValidMention = confirmedMentions.some(m => m.title === mentionTitle);
                if (isValidMention) {
                  return (
                    <span key={index} className="mention-tag">
                      {part.slice(1)}
                    </span>
                  );
                }
                // For @mentions that are not in confirmedMentions, show them as normal text
                // unless the context selector is open (indicating it's a pending mention)
                const isPendingMention = showMentionContextSelector && part.length > 1;
                if (isPendingMention) {
                  return <span key={index} className="opacity-0 select-none">{part.replace(/./g, ' ')}</span>;
                }
                // Show @ as normal text
                return <span key={index} className="text-foreground">{part}</span>;
              }
              return <span key={index} className="text-foreground">{part}</span>;
            })}
          </div>




        </div>

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
        />

        <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
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
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (!equal(prevProps.confirmedMentions, nextProps.confirmedMentions)) return false;
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
      className="rounded-sm p-1.5 h-fit border dark:border-zinc-600"
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
  return (
    <Button
      data-testid="send-button"
      className="rounded-sm p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.trim().length === 0 || uploadQueue.length > 0}
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

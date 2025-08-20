'use server';

interface SendFeedbackParams {
  feedbackContent: string;
  userEmail?: string;
  userId?: string;
}

export async function sendFeedbackToDiscord({
  feedbackContent,
  userEmail,
  userId,
}: SendFeedbackParams): Promise<{ success: boolean; error?: string }> {
  if (!feedbackContent) {
    return { success: false, error: 'Feedback content cannot be empty.' };
  }

  try {
    // Log feedback to console for development
    console.log('[Feedback Action] New feedback received:', {
      userId: userId || 'N/A',
      userEmail: userEmail || 'N/A',
      feedback: feedbackContent,
    });

    // For now, just log the feedback. You can integrate with your preferred
    // feedback service (email, database, external API, etc.)
    return { success: true };
  } catch (error: any) {
    console.error('[Feedback Action] Error processing feedback:', error);

    let errorMessage =
      'An unexpected error occurred while processing feedback.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

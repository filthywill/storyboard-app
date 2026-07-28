import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FeedbackService,
  type FeedbackCategory,
} from '@/services/feedbackService';
import {
  trackFeedbackSubmissionFailed,
  trackFeedbackSubmitted,
} from '@/services/analytics/feedbackTracking';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import { useAuthStore } from '@/store/authStore';
import { getWorkspaceMode } from '@/services/workspaceModeService';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: 'Report a problem',
  improvement: 'Suggest an improvement',
  general: 'General feedback',
};

const categoryPrompts: Record<FeedbackCategory, string> = {
  bug: 'What happened?',
  improvement: 'What would make StoryboardFlow better?',
  general: 'What would you like us to know?',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const feedbackFieldClassName =
  'placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const feedbackFieldStyle: React.CSSProperties = {
  backgroundColor: getColor('input', 'background') as string,
  border: `1px solid ${getColor('input', 'border') as string}`,
  color: getColor('text', 'primary') as string,
  caretColor: getColor('brand', 'primary') as string,
  colorScheme: 'dark',
  WebkitTextFillColor: getColor('text', 'primary') as string,
};

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [message, setMessage] = useState('');
  const [contactPermission, setContactPermission] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const workspaceMode = user?.id ? getWorkspaceMode(user.id) : undefined;

  const reset = () => {
    setCategory('');
    setMessage('');
    setContactPermission(false);
    setGuestEmail('');
    setCategoryError(null);
    setMessageError(null);
    setEmailError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  const close = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const validate = (): FeedbackCategory | null => {
    const trimmedMessage = message.trim();
    let valid = true;

    if (!category) {
      setCategoryError('Choose a feedback type.');
      valid = false;
    } else {
      setCategoryError(null);
    }

    if (!trimmedMessage) {
      setMessageError('Enter your feedback before sending.');
      valid = false;
    } else if (trimmedMessage.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
      setMessageError(`Feedback must be ${FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString()} characters or fewer.`);
      valid = false;
    } else {
      setMessageError(null);
    }

    if (!isAuthenticated && contactPermission) {
      if (!EMAIL_PATTERN.test(guestEmail.trim())) {
        setEmailError('Enter a valid email address for follow-up.');
        valid = false;
      } else {
        setEmailError(null);
      }
    } else {
      setEmailError(null);
    }

    return valid && category ? category : null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const selectedCategory = validate();
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const result = await FeedbackService.submitFeedback({
        category: selectedCategory,
        message,
        contactPermission,
        guestEmail: !isAuthenticated && contactPermission ? guestEmail : undefined,
      });

      if (result.ok) {
        trackFeedbackSubmitted({
          category: selectedCategory,
          is_guest: result.isGuest,
          has_contact_permission: contactPermission,
          workspace_mode: result.workspaceMode,
        });
        toast.success('Feedback sent. Thank you.');
        reset();
        onOpenChange(false);
        return;
      }

      trackFeedbackSubmissionFailed({
        category: selectedCategory,
        is_guest: result.isGuest,
        has_contact_permission: contactPermission,
        workspace_mode: result.workspaceMode,
        failure_code: result.code,
      });
      toast.error(
        result.code === 'offline'
          ? 'You’re offline. Connect to the internet and try again.'
          : 'We couldn’t send your feedback. Please try again.'
      );
    } catch {
      trackFeedbackSubmissionFailed({
        category: selectedCategory,
        is_guest: !isAuthenticated,
        has_contact_permission: contactPermission,
        workspace_mode: workspaceMode,
        failure_code: 'unavailable',
      });
      toast.error('We couldn’t send your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messagePrompt = category ? categoryPrompts[category] : 'Tell us about your feedback.';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md" style={getGlassmorphismStyles('dark')}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            Send feedback
          </DialogTitle>
          <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
            Help us improve StoryboardFlow. Your feedback is sent directly to our team.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset aria-describedby={categoryError ? 'feedback-category-error' : undefined}>
            <legend className="mb-2 text-sm font-medium" style={{ color: getColor('text', 'primary') as string }}>
              Feedback type
            </legend>
            <RadioGroup
              value={category}
              onValueChange={(value) => {
                if (value === 'bug' || value === 'improvement' || value === 'general') {
                  setCategory(value);
                  setCategoryError(null);
                }
              }}
              className="space-y-2"
            >
              {(Object.keys(categoryLabels) as FeedbackCategory[]).map((value) => (
                <div className="flex items-center gap-2" key={value}>
                  <RadioGroupItem value={value} id={`feedback-category-${value}`} />
                  <Label htmlFor={`feedback-category-${value}`} className="cursor-pointer text-sm">
                    {categoryLabels[value]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {categoryError && (
              <p id="feedback-category-error" className="mt-2 text-xs text-red-300" role="alert">
                {categoryError}
              </p>
            )}
          </fieldset>

          <div>
            <Label htmlFor="feedback-message">{messagePrompt}</Label>
            <Textarea
              id="feedback-message"
              className={`mt-2 min-h-28 resize-y ${feedbackFieldClassName}`}
              style={{
                ...feedbackFieldStyle,
                borderColor: messageError
                  ? getColor('status', 'errorGlow') as string
                  : getColor('input', 'border') as string,
              }}
              value={message}
              placeholder={messagePrompt}
              onChange={(event) => {
                setMessage(event.target.value);
                if (messageError) setMessageError(null);
              }}
              maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'feedback-message-error' : 'feedback-message-limit'}
            />
            <div className="mt-1 flex justify-between text-xs" style={{ color: getColor('text', 'muted') as string }}>
              <span id="feedback-message-limit">
                {message.length.toLocaleString()} / {FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString()}
              </span>
            </div>
            {messageError && (
              <p id="feedback-message-error" className="mt-1 text-xs text-red-300" role="alert">
                {messageError}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="feedback-contact-permission"
              checked={contactPermission}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setContactPermission(enabled);
                if (!enabled) {
                  setGuestEmail('');
                  setEmailError(null);
                }
              }}
            />
            <Label htmlFor="feedback-contact-permission" className="cursor-pointer text-sm leading-5">
              You may contact me about this feedback.
            </Label>
          </div>

          {!isAuthenticated && contactPermission && (
            <div>
              <Label htmlFor="feedback-guest-email">Email for follow-up</Label>
              <Input
                id="feedback-guest-email"
                type="email"
                autoComplete="email"
                className={`mt-2 ${feedbackFieldClassName}`}
                style={{
                  ...feedbackFieldStyle,
                  borderColor: emailError
                    ? getColor('status', 'errorGlow') as string
                    : getColor('input', 'border') as string,
                }}
                value={guestEmail}
                placeholder="you@example.com"
                onChange={(event) => {
                  setGuestEmail(event.target.value);
                  if (emailError) setEmailError(null);
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'feedback-guest-email-error' : undefined}
              />
              {emailError && (
                <p id="feedback-guest-email-error" className="mt-1 text-xs text-red-300" role="alert">
                  {emailError}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={close} disabled={isSubmitting} style={getGlassmorphismStyles('button')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} style={getGlassmorphismStyles('buttonAccent')}>
              {isSubmitting ? 'Sending…' : 'Send feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

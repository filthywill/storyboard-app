import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface ConfirmEmailScreenProps {
  email: string;
  onResend: () => void;
  onChangeEmail: () => void;
  resendStatus?: 'idle' | 'sending' | 'sent' | 'error';
  resendCooldownSeconds?: number;
  resendError?: string | null;
  isChecking?: boolean;
}

export const ConfirmEmailScreen: React.FC<ConfirmEmailScreenProps> = ({
  email,
  onResend,
  onChangeEmail,
  resendStatus = 'idle',
  resendCooldownSeconds = 0,
  resendError,
}) => {
  const isResendDisabled = resendStatus === 'sending' || resendCooldownSeconds > 0;
  const resendLabel =
    resendStatus === 'sending'
      ? 'Sending...'
      : resendCooldownSeconds > 0
        ? `Resend available in ${resendCooldownSeconds} seconds`
        : 'Resend email';
  const statusMessage =
    resendStatus === 'sent'
      ? 'Verification email sent. Please check your inbox.'
      : resendStatus === 'error'
        ? resendError || 'Failed to resend verification email.'
        : '';
  const statusColor =
    resendStatus === 'sent'
      ? getColor('text', 'primary')
      : resendStatus === 'error'
        ? getColor('text', 'secondary')
        : getColor('text', 'muted');

  return (
    <Card className="mx-auto w-full max-w-5xl shadow-2xl" style={getGlassmorphismStyles('dark')}>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold" style={{ color: getColor('text', 'primary') as string }}>
            Verify {email}
          </h2>
          <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
            Verify your email to back up your project and access it from any device.
          </p>
          <p
            className="min-h-[1rem] text-xs"
            aria-live="polite"
            aria-atomic="true"
            style={{
              color: statusColor as string,
              visibility: statusMessage ? 'visible' : 'hidden'
            }}
          >
            {statusMessage || '\u00A0'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              style={getGlassmorphismStyles('buttonAccent')}
              onClick={onResend}
              disabled={isResendDisabled}
            >
              {resendLabel}
            </Button>
            <Button
              className="w-full sm:w-auto"
              style={getGlassmorphismStyles('buttonSecondary')}
              onClick={onChangeEmail}
            >
              Change email
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

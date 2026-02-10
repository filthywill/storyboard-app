import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface ConfirmEmailScreenProps {
  email: string;
  onResend: () => void;
  onChangeEmail: () => void;
  onCheckConfirmed: () => void;
}

export const ConfirmEmailScreen: React.FC<ConfirmEmailScreenProps> = ({
  email,
  onResend,
  onChangeEmail,
  onCheckConfirmed,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-2xl" style={getGlassmorphismStyles('dark')}>
        <CardHeader className="text-center">
          <CardTitle style={{ color: getColor('text', 'primary') as string }}>
            Confirm your email to finish setup
          </CardTitle>
          <CardDescription style={{ color: getColor('text', 'secondary') as string }}>
            {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
            Your project is saved on this device until you confirm.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              style={getGlassmorphismStyles('buttonAccent')}
              onClick={onResend}
            >
              Resend email
            </Button>
            <Button
              className="w-full"
              style={getGlassmorphismStyles('buttonSecondary')}
              onClick={onChangeEmail}
            >
              Change email
            </Button>
            <Button
              className="w-full"
              style={getGlassmorphismStyles('button')}
              onClick={onCheckConfirmed}
            >
              I confirmed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

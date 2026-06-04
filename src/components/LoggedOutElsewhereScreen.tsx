import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { getGlassmorphismStyles, getColor, MODAL_OVERLAY_STYLES } from '@/styles/glassmorphism-styles';

interface LoggedOutElsewhereScreenProps {
  onSignIn: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

export const LoggedOutElsewhereScreen: React.FC<LoggedOutElsewhereScreenProps> = ({
  onSignIn,
  title = 'You’ve logged in elsewhere',
  message = 'Your current session was closed because you signed in on another device.',
  buttonText = 'Sign in again'
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={MODAL_OVERLAY_STYLES}>
      <Card className="w-96 shadow-2xl" style={getGlassmorphismStyles('dark')}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{ color: getColor('text', 'primary') as string }}>{title}</CardTitle>
          <CardDescription className="text-base mt-2" style={{ color: getColor('text', 'secondary') as string }}>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <Button onClick={onSignIn} size="lg" className="w-full" variant="default">
            <LogIn className="h-5 w-5 mr-2" />
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};



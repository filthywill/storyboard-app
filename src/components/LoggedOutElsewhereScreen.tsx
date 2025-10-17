import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface LoggedOutElsewhereScreenProps {
  onSignIn: () => void;
}

export const LoggedOutElsewhereScreen: React.FC<LoggedOutElsewhereScreenProps> = ({ onSignIn }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="w-96 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You’ve logged in elsewhere</CardTitle>
          <CardDescription className="text-base mt-2">
            Your current session was closed because you signed in on another device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <Button onClick={onSignIn} size="lg" className="w-full" variant="default">
            <LogIn className="h-5 w-5 mr-2" />
            Sign in again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};



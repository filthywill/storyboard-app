import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getColor } from '@/styles/glassmorphism-styles';
import { LogOut } from 'lucide-react';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

export const UserAccountDropdown: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  // Extract name from email (before @) or use email as fallback
  const displayName = user.email?.split('@')[0] || 'User';
  const userInitials = displayName.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="text-base px-2 py-1 rounded transition-colors"
          style={{ 
            fontFamily: '"Gabarito", sans-serif',
            fontWeight: 600,
            ...getGlassmorphismStyles('button')
          }}
        >
          {user.email}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        style={getGlassmorphismStyles('dark')}
      >
        {/* User Info Section */}
        <div className="p-6 text-center">
          {/* Avatar */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
            {userInitials}
          </div>
          
          {/* User Name */}
          <div 
            className="text-white text-lg mb-1"
            style={{ 
              fontFamily: '"Gabarito", sans-serif',
              fontWeight: 700
            }}
          >
            {displayName}
          </div>
          
          {/* User Email */}
          <div 
            className="text-sm mb-4"
            style={{ 
              fontFamily: '"Gabarito", sans-serif',
              fontWeight: 600,
              color: getColor('text', 'muted') as string 
            }}
          >
            {user.email}
          </div>
          
          {/* Sign Out Button */}
          <Button
            size="sm"
            onClick={signOut}
            className="w-full mb-4"
            style={getGlassmorphismStyles('button')}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
        
        {/* Divider */}
        <div style={{ borderTop: `1px solid ${getColor('border', 'primary')}` }}></div>
        
        {/* Policy Links */}
        <div className="p-4 text-center">
          <div 
            className="flex justify-center items-center gap-2 text-sm"
            style={{ color: getColor('text', 'muted') as string }}
          >
            <a 
              href="/privacy" 
              className="hover:transition-colors"
              style={{ 
                color: 'inherit'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = getColor('text', 'primary') as string}
              onMouseLeave={(e) => e.currentTarget.style.color = getColor('text', 'muted') as string}
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a 
              href="/terms" 
              className="hover:transition-colors"
              style={{ color: 'inherit' }}
              onMouseEnter={(e) => e.currentTarget.style.color = getColor('text', 'primary') as string}
              onMouseLeave={(e) => e.currentTarget.style.color = getColor('text', 'muted') as string}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

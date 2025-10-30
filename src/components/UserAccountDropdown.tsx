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
          className="text-base text-white hover:bg-white/20 hover:text-white px-2 py-1 rounded transition-colors"
          style={{ fontFamily: '"BBH Sans Hegarty", sans-serif' }}
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
          <div className="text-white font-semibold text-lg mb-1">
            {displayName}
          </div>
          
          {/* User Email */}
          <div className="text-gray-400 text-sm mb-4">
            {user.email}
          </div>
          
          {/* Sign Out Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="w-full mb-4 text-white hover:bg-white/20 hover:text-white"
            style={{
              backgroundColor: 'rgba(1, 1, 1, 0.2)',
              backdropFilter: 'blur(0.5px)',
              WebkitBackdropFilter: 'blur(0.5px)',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-600"></div>
        
        {/* Policy Links */}
        <div className="p-4 text-center">
          <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
            <a 
              href="/privacy" 
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a 
              href="/terms" 
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

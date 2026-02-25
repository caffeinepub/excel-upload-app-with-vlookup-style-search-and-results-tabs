import React from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { LogIn, LogOut } from 'lucide-react';

export function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const text = loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button
      onClick={handleAuth}
      disabled={disabled}
      variant={isAuthenticated ? 'outline' : 'default'}
      size="sm"
    >
      {isAuthenticated ? (
        <LogOut className="w-4 h-4 mr-2" />
      ) : (
        <LogIn className="w-4 h-4 mr-2" />
      )}
      {text}
    </Button>
  );
}

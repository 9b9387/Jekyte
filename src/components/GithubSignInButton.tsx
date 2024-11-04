import { useState, useEffect } from 'react';
import { Box, Button } from '@mui/joy';
import { GitHub as GitHubIcon } from '@mui/icons-material';
import CircularProgress from '@mui/joy/CircularProgress';

interface GithubSignInButtonProps {
  onSignIn?: () => Promise<void>;
}

export function GithubSignInButton({ onSignIn }: GithubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleOAuthSuccess = (_event: any, token: string) => {
      console.log('OAuth successful');
      setIsLoading(false);
      // 处理成功登录
    };

    const handleOAuthError = (_event: any, error: string) => {
      console.error('OAuth failed:', error);
      setIsLoading(false);
      // 处理错误
    };

    window.ipcRenderer.on('oauth-success', handleOAuthSuccess);
    window.ipcRenderer.on('oauth-error', handleOAuthError);

    return () => {
      window.ipcRenderer.off('oauth-success', handleOAuthSuccess);
      window.ipcRenderer.off('oauth-error', handleOAuthError);
    };
  }, []);

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await window.github.initiateOAuth();
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="soft"
      color="neutral"
      startDecorator={
        <Box 
          sx={{ 
            width: 24, 
            height: 24, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          {isLoading ? <CircularProgress size="sm" /> : <GitHubIcon />}
        </Box>
      }
      size="lg"
      disabled={isLoading}
      onClick={handleClick}
      sx={{
        borderRadius: 'md',
        padding: '10px 20px',
        fontSize: '16px',
        '--Button-gap': '12px',
      }}
    >
      Sign in with GitHub
    </Button>
  );
} 
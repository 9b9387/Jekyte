import { useState } from 'react';
import { Box, Button } from '@mui/joy';
import { GitHub as GitHubIcon } from '@mui/icons-material';
import CircularProgress from '@mui/joy/CircularProgress';

interface GithubSignInButtonProps {
  onSignIn?: () => Promise<void>;
}

export function GithubSignInButton({ onSignIn }: GithubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onSignIn?.();
    } finally {
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
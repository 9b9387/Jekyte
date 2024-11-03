import { Button } from '@mui/joy';
import { GitHub as GitHubIcon } from '@mui/icons-material';


function App() {
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: 0,
      padding: 0,
    }}>
      <Button
        variant="soft"
        color="neutral"
        startDecorator={<GitHubIcon />}
        size="lg"
        sx={{
          borderRadius: 'md',
          padding: '10px 20px',
          fontSize: '16px',
          '--Button-gap': '12px',
        }}
      >
        Sign in with GitHub
      </Button>
    </div>
  )
}

export default App

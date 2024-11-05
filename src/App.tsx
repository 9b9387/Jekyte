import { GithubSignInButton } from './components/GithubSignInButton';
import { GitCloneForm } from './components/GitCloneForm';

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
      <GithubSignInButton 
        onSignIn={async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }} 
      />
      <GitCloneForm />
    </div>
  );
}

export default App;

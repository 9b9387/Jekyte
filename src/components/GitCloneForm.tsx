import { useState } from 'react';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GitHubIcon from '@mui/icons-material/GitHub';

export function GitCloneForm() {
  const [gitUrl, setGitUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [isSelectingPath, setIsSelectingPath] = useState(false);

  const handleSelectPath = async () => {
    try {
      setIsSelectingPath(true);
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath) {
        setLocalPath(selectedPath);
      }
    } catch (error) {
      console.error('选择路径失败:', error);
    } finally {
      setIsSelectingPath(false);
    }
  };

  const handleClone = async () => {
    console.log('克隆仓库:', { gitUrl, localPath });
    await window.github.clone(gitUrl, localPath);
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 500, p: 3 }}>
      <Stack spacing={2}>
        <FormControl>
          <FormLabel>Git 仓库地址</FormLabel>
          <Input
            startDecorator={<GitHubIcon />}
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            placeholder="https://github.com/username/repo.git"
          />
        </FormControl>

        <FormControl>
          <FormLabel>本地路径</FormLabel>
          <Input
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="选择或输入本地路径"
            endDecorator={
              <Button
                variant="outlined"
                onClick={handleSelectPath}
                startDecorator={<FolderOpenIcon />}
                loading={isSelectingPath}
              >
                选择路径
              </Button>
            }
          />
        </FormControl>

        <Button
          variant="solid"
          color="primary"
          disabled={!gitUrl || !localPath}
          onClick={handleClone}
          sx={{ mt: 1 }}
        >
          克隆仓库
        </Button>
      </Stack>
    </Card>
  );
} 
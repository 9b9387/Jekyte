import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { GitHubService } from './github-service'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let githubService: GitHubService | null = null;


protocol.registerSchemesAsPrivileged([
{
    scheme: 'jekyte',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    }
  }
]);

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  githubService = new GitHubService();

  ipcMain.handle('github-oauth', async () => {
    await githubService!.initiateOAuth();
  });

  ipcMain.handle('github-clone', async (event, url: string, dir: string, onProgress?: (progress: { phase: string; loaded: number; total: number }) => void) => {
    await githubService!.cloneRepository(url, dir, onProgress);
  });
  
  // 添加 IPC 处理程序
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '选择克隆目标文件夹',
    });
    
    return result.filePaths[0];
  });
  win.webContents.openDevTools()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('open-url', async (event, url) => {
  console.log("open-url: " + url);
  event.preventDefault();
  if (url.startsWith('jekyte://github-oauth/callback')) {
    const code = new URL(url).searchParams.get('code');
    const state = new URL(url).searchParams.get('state');
    console.log("code: " + code);
    if (code && state) {
      await githubService!.handleOAuthCallback(code, state);
    }
  }
});

if (process.platform === 'darwin') {
  app.setAsDefaultProtocolClient('jekyte');
}

app.whenReady().then(async () => {
  createWindow();
})

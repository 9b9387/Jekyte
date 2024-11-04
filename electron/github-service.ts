import dotenv from 'dotenv';
import path from 'path';
import { BrowserWindow, shell } from 'electron';
import axios from 'axios';

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

export class GitHubService {
  private static readonly CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  private static readonly REDIRECT_URI = 'jekyte://github-oauth/callback';
  private static readonly SCOPE = 'repo user';

  private state: string = '';

  private readonly githubApi = axios.create({
    baseURL: 'https://github.com',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 10000, // 10秒超时
  });

  constructor() {
    // 验证必要的环境变量是否存在
    if (!GitHubService.CLIENT_ID || !GitHubService.CLIENT_SECRET) {
      throw new Error('GitHub OAuth credentials not configured. Please check your .env file.');
    }
    
    // 添加响应拦截器统一处理错误
    this.githubApi.interceptors.response.use(
      response => response,
      error => {
        console.error('GitHub API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  public async initiateOAuth() {
    this.state = this.generateState();
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', GitHubService.CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', GitHubService.REDIRECT_URI);
    authUrl.searchParams.append('scope', GitHubService.SCOPE);
    authUrl.searchParams.append('state', this.state);
    
    // 使用系统默认浏览器打开认证页面
    await shell.openExternal(authUrl.toString());
  }

  private generateState(): string {
    return crypto.randomUUID();
  }

  public async handleOAuthCallback(code: string, state: string): Promise<void> {
    console.log("handleOAuthCallback: ", code, state);
    if (state !== this.state) {
      console.error("State mismatch:", state, this.state);
      return;
    }
    try {
      const { data } = await this.githubApi.post('/login/oauth/access_token', {
        client_id: GitHubService.CLIENT_ID,
        client_secret: GitHubService.CLIENT_SECRET,
        code: code,
        redirect_uri: GitHubService.REDIRECT_URI
      });

      console.log("OAuth response:", data);

      if (data.access_token) {
        console.log("Access token received successfully");
        // 存储访问令牌并发送成功消息到渲染进程
        // TODO: 实现安全的令牌存储
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'oauth-success', 
          data.access_token
        );
      } else {
        console.error("No access token in response:", data);
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'oauth-error', 
          data.error_description || 'Failed to get access token'
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error_description 
          || error.message 
          || 'Failed to complete OAuth process';
        
        console.error("Axios error during OAuth:", {
          message: errorMessage,
          response: error.response?.data,
          status: error.response?.status
        });
        
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'oauth-error', 
          errorMessage
        );
      } else {
        console.error("Unexpected error during OAuth:", error);
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'oauth-error', 
          'An unexpected error occurred'
        );
      }
    }
  }
} 
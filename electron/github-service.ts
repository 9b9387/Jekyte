import dotenv from 'dotenv';
import path from 'path';
import { BrowserWindow, shell } from 'electron';
import axios, { AxiosInstance } from 'axios';
import { TokenManager } from './token-manager';
import git from 'isomorphic-git';
import fs from 'fs-extra';
import http from 'isomorphic-git/http/node';

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
  private accessToken: string | null = null;

  // GitHub API 客户端
  private readonly githubApi: AxiosInstance;
  private readonly authApi: AxiosInstance;

  public constructor() {
    this.validateConfig();
    this.githubApi = this.createGithubApiClient();
    this.authApi = this.createAuthApiClient();
    this.setupInterceptors();
    this.initialize();
  }

  // 异步工厂方法
  // public static async getInstance(): Promise<GitHubService> {
  //   if (!this.instance) {
  //     this.instance = new GitHubService();
  //     await this.instance.initialize();
  //   }
  //   return this.instance;
  // }

  private validateConfig() {
    if (!GitHubService.CLIENT_ID || !GitHubService.CLIENT_SECRET) {
      throw new Error('GitHub OAuth credentials not configured. Please check your .env file.');
    }
  }

  private createGithubApiClient(): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });
  }

  private createAuthApiClient(): AxiosInstance {
    return axios.create({
      baseURL: 'https://github.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });
  }

  private async initialize(): Promise<void> {
    try {
      this.accessToken = await TokenManager.getToken();
      console.log("initialize accessToken: " + this.accessToken);
      if (this.accessToken) {
        const isValid = await this.validateToken();
        if (!isValid) {
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Failed to initialize GitHub service:', error);
      throw error;
    }
  }

  private setupInterceptors(): void {
    // API 请求拦截器
    this.githubApi.interceptors.request.use(
      config => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      }
    );

    // API 响应拦截器
    this.githubApi.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          const refreshed = await this.validateToken();
          if (refreshed && error.config) {
            // 重试失败的请求
            return this.githubApi.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public async initiateOAuth(): Promise<void> {
    this.state = crypto.randomUUID();
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', GitHubService.CLIENT_ID!);
    authUrl.searchParams.append('redirect_uri', GitHubService.REDIRECT_URI);
    authUrl.searchParams.append('scope', GitHubService.SCOPE);
    authUrl.searchParams.append('state', this.state);
    
    await shell.openExternal(authUrl.toString());
  }

  public async handleOAuthCallback(code: string, state: string): Promise<void> {
    if (state !== this.state) {
      throw new Error('Invalid state parameter');
    }

    try {
      const { data } = await this.authApi.post('/login/oauth/access_token', {
        client_id: GitHubService.CLIENT_ID,
        client_secret: GitHubService.CLIENT_SECRET,
        code: code,
        redirect_uri: GitHubService.REDIRECT_URI
      });

      if (data.access_token) {
        console.log("access_token: " + data.access_token);
        await this.setAccessToken(data.access_token);
        BrowserWindow.getAllWindows()[0]?.webContents.send('oauth-success');
      } else {
        throw new Error(data.error_description || 'Failed to get access token');
      }
    } catch (error) {
      this.handleError('OAuth error', error);
      throw error;
    }
  }

  private async setAccessToken(token: string): Promise<void> {
    await TokenManager.saveToken(token);
    this.accessToken = token;
  }

  private async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;
    
    try {
      const response = await this.githubApi.get('/user');
      console.log('User data:', response.data);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  public async logout(): Promise<void> {
    await TokenManager.deleteToken();
    this.accessToken = null;
    BrowserWindow.getAllWindows()[0]?.webContents.send('logout');
  }

  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private handleError(context: string, error: any): void {
    if (axios.isAxiosError(error)) {
      console.error(`${context}:`, {
        message: error.response?.data?.error_description || error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      console.error(`${context}:`, error);
    }
  }

  // 公共 API 方法
  public async getCurrentUser() {
    const response = await this.githubApi.get('/user');
    return response.data;
  }

  /**
   * 克隆仓库
   * @param url 仓库地址
   * @param dir 目标目录
   * @param onProgress 进度回调
   */
  public async cloneRepository(
    url: string, 
    dir: string, 
    onProgress?: (progress: { phase: string; loaded: number; total: number }) => void
  ): Promise<void> {
    try {
      // 确保目标目录存在
      await fs.ensureDir(dir);

      // 设置认证信息
      const auth = this.accessToken ? {
        username: 'oauth2',
        password: this.accessToken
      } : undefined;

      // 执行克隆
      await git.clone({
        fs,
        http,
        dir,
        url,
        depth: 1, // 可选：浅克隆
        singleBranch: true, // 可选：只克隆单个分支
        oauth2format: 'bearer',
        onProgress,
        ...auth ? { auth } : {},
        headers: {
          'User-Agent': 'jekyte-app'
        }
      });
    } catch (error) {
      this.handleError('Clone repository error', error);
      throw new Error(
        error instanceof Error 
          ? `克隆仓库失败: ${error.message}` 
          : '克隆仓库时发生未知错误'
      );
    }
  }

  /**
   * 检查目录是否为空
   * @param dir 目标目录
   */
  private async isDirectoryEmpty(dir: string): Promise<boolean> {
    try {
      const files = await fs.readdir(dir);
      return files.length === 0;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true; // 目录不存在视为空
      }
      throw error;
    }
  }

  /**
   * 检查仓库 URL 是否有效
   * @param url 仓库地址
   */
  public async validateRepositoryUrl(url: string): Promise<boolean> {
    try {
      // 从 URL 中提取所有者和仓库名
      const match = url.match(/github\.com[/:]([\w-]+)\/([\w-]+)(?:\.git)?$/);
      if (!match) return false;

      const [, owner, repo] = match;
      
      // 检查仓库是否存在且可访问
      const response = await this.githubApi.get(`/repos/${owner}/${repo}`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
} 
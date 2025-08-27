export interface CloudServiceConfig {
  githubToken?: string;
  googleCredentialsPath?: string;
}

export class CloudService {
  constructor(private readonly cfg: CloudServiceConfig = {}) {}

  async listRepos(_org?: string): Promise<string[]> {
    // Placeholder; wire to GitHub API later using cfg.githubToken
    return [];
  }

  async readDriveFile(_fileId: string): Promise<string> {
    // Placeholder; wire to Google Drive API later using cfg.googleCredentialsPath
    return '';
  }
}

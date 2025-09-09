import fs from 'fs';
import path from 'path';

export const ProjectFileListTool = {
  name: 'project-file-list',
  description: 'Lists all files and folders in the project root directory.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async invoke() {
    const root = path.resolve(process.cwd());
    const files = await fs.promises.readdir(root);
    return files.join('\n');
  }
};
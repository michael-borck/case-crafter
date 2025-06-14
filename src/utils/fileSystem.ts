import { 
  readTextFile, 
  writeTextFile, 
  exists, 
  create, 
  readDir,
  remove,
  copyFile,
  BaseDirectory 
} from '@tauri-apps/plugin-fs';
import { 
  open, 
  save, 
  ask, 
  confirm 
} from '@tauri-apps/plugin-dialog';

/**
 * File system utilities for Case Crafter
 * Provides safe file operations with proper error handling
 */

export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  modified?: Date;
  isDirectory: boolean;
}

export interface SaveOptions {
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface OpenOptions {
  multiple?: boolean;
  directory?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

/**
 * Application data directory operations
 */
export class AppDataManager {
  private static readonly APP_DIR = 'case-crafter';

  /**
   * Initialize application data directory structure
   */
  static async initialize(): Promise<void> {
    try {
      const dirs = [
        'database',
        'exports', 
        'imports',
        'templates',
        'models',
        'config',
        'logs',
        'backups'
      ];

      // Create main app directory
      await this.ensureDirectory('');
      
      // Create subdirectories
      for (const dir of dirs) {
        await this.ensureDirectory(dir);
      }
    } catch (error) {
      console.error('Failed to initialize app data directories:', error);
      throw new Error('Could not create application data directories');
    }
  }

  /**
   * Ensure a directory exists in the app data folder
   */
  static async ensureDirectory(relativePath: string): Promise<void> {
    const fullPath = relativePath ? `${this.APP_DIR}/${relativePath}` : this.APP_DIR;
    
    if (!(await exists(fullPath, { baseDir: BaseDirectory.AppData }))) {
      await create(fullPath, { 
        baseDir: BaseDirectory.AppData
      });
    }
  }

  /**
   * Read a file from the app data directory
   */
  static async readFile(relativePath: string): Promise<string> {
    const fullPath = `${this.APP_DIR}/${relativePath}`;
    return await readTextFile(fullPath, { baseDir: BaseDirectory.AppData });
  }

  /**
   * Write a file to the app data directory
   */
  static async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = `${this.APP_DIR}/${relativePath}`;
    await writeTextFile(fullPath, content, { baseDir: BaseDirectory.AppData });
  }

  /**
   * Check if a file exists in the app data directory
   */
  static async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = `${this.APP_DIR}/${relativePath}`;
    return await exists(fullPath, { baseDir: BaseDirectory.AppData });
  }

  /**
   * List files in an app data directory
   */
  static async listFiles(relativePath: string = ''): Promise<FileInfo[]> {
    const fullPath = relativePath ? `${this.APP_DIR}/${relativePath}` : this.APP_DIR;
    const entries = await readDir(fullPath, { baseDir: BaseDirectory.AppData });
    
    return entries.map(entry => ({
      name: entry.name,
      path: entry.name, // Use name as path since full path is complex
      isDirectory: entry.isDirectory
    }));
  }

  /**
   * Delete a file from the app data directory
   */
  static async deleteFile(relativePath: string): Promise<void> {
    const fullPath = `${this.APP_DIR}/${relativePath}`;
    await remove(fullPath, { baseDir: BaseDirectory.AppData });
  }

  /**
   * Copy a file within the app data directory
   */
  static async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const fullSourcePath = `${this.APP_DIR}/${sourcePath}`;
    const fullDestPath = `${this.APP_DIR}/${destPath}`;
    
    await copyFile(fullSourcePath, fullDestPath, { 
      fromPathBaseDir: BaseDirectory.AppData,
      toPathBaseDir: BaseDirectory.AppData
    });
  }
}

/**
 * User file operations (imports, exports)
 */
export class UserFileManager {
  /**
   * Show file picker dialog to open files
   */
  static async openFiles(options: OpenOptions = {}): Promise<string[] | null> {
    const result = await open({
      multiple: options.multiple || false,
      directory: options.directory || false,
      filters: options.filters || []
    });

    if (result === null) return null;
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Show save dialog to save a file
   */
  static async saveFile(content: string, options: SaveOptions = {}): Promise<string | null> {
    const saveOptions: any = {
      filters: options.filters || []
    };
    
    if (options.defaultPath) {
      saveOptions.defaultPath = options.defaultPath;
    }

    const filePath = await save(saveOptions);

    if (filePath) {
      await writeTextFile(filePath, content);
      return filePath;
    }

    return null;
  }

  /**
   * Read content from a user-selected file
   */
  static async readUserFile(filePath: string): Promise<string> {
    return await readTextFile(filePath);
  }

  /**
   * Export case study to various formats
   */
  static async exportCaseStudy(
    content: string, 
    format: 'pdf' | 'docx' | 'html' | 'txt' | 'json',
    defaultName?: string
  ): Promise<string | null> {
    const filters = {
      pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
      docx: [{ name: 'Word Documents', extensions: ['docx'] }],
      html: [{ name: 'HTML Files', extensions: ['html'] }],
      txt: [{ name: 'Text Files', extensions: ['txt'] }],
      json: [{ name: 'JSON Files', extensions: ['json'] }]
    };

    const saveOptions: SaveOptions = {
      filters: filters[format]
    };
    
    if (defaultName) {
      saveOptions.defaultPath = `${defaultName}.${format}`;
    }
    
    return await this.saveFile(content, saveOptions);
  }

  /**
   * Import case study from file
   */
  static async importCaseStudy(): Promise<{ content: string; fileName: string } | null> {
    const filters = [
      { name: 'All Supported', extensions: ['txt', 'json', 'html', 'md'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'HTML Files', extensions: ['html'] },
      { name: 'Markdown Files', extensions: ['md'] }
    ];

    const filePaths = await this.openFiles({ filters });
    if (!filePaths || filePaths.length === 0) return null;

    const filePath = filePaths[0];
    if (!filePath) return null;
    
    const content = await this.readUserFile(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'unknown';

    return { content, fileName };
  }
}

/**
 * Dialog utilities
 */
export class DialogManager {
  /**
   * Show information message (using confirm dialog for now)
   */
  static async showInfo(title: string, message: string): Promise<void> {
    await confirm(`${title}\n\n${message}`, { title, kind: 'info' });
  }

  /**
   * Show error message (using confirm dialog for now)
   */
  static async showError(title: string, message: string): Promise<void> {
    await confirm(`${title}\n\n${message}`, { title, kind: 'error' });
  }

  /**
   * Show warning message (using confirm dialog for now)
   */
  static async showWarning(title: string, message: string): Promise<void> {
    await confirm(`${title}\n\n${message}`, { title, kind: 'warning' });
  }

  /**
   * Ask yes/no question
   */
  static async askConfirmation(title: string, message: string): Promise<boolean> {
    return await ask(message, { title, kind: 'info' });
  }

  /**
   * Confirm action
   */
  static async confirmAction(title: string, message: string): Promise<boolean> {
    return await confirm(message, { title, kind: 'warning' });
  }
}

/**
 * Initialize file system on app startup
 */
export async function initializeFileSystem(): Promise<void> {
  try {
    await AppDataManager.initialize();
    console.log('File system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize file system:', error);
    await DialogManager.showError(
      'Initialization Error',
      'Failed to initialize application data directories. The app may not function correctly.'
    );
  }
}
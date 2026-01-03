#!/usr/bin/env node

/**
 * Host Deployment Script
 * Updates all .env* files on remote server and optionally runs deployment
 * Uses ssh2 for persistent SSH connections
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const Module = require('module');

// Configuration - UPDATE THESE VALUES
const SERVER_USER = 'ubuntu';
const SERVER_HOST = 'customerzone.in';
const APP_PATH = '/home/ubuntu/htdocs/customerzone';
const DEPLOY_SCRIPT = './backend/deploy.sh';
const BACKUP_REPO_URL = 'https://github.com/brahamandAI/backup-envs';
const BACKUP_REPO_DIR_NAME = 'backup-envs';
const BACKUP_REPO_DOWNLOAD_DIR_NAME = 'backup-envs-download';
const BACKUP_FILENAME_PREFIX = 'customerzone';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Print functions
const print = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
};

// Ensure Node can resolve globally installed modules (e.g., ssh2)
function ensureGlobalNodePath() {
  if (process.env.NODE_PATH && process.env.NODE_PATH.length > 0) {
    return;
  }

  try {
    const npmRoot = execSync('npm root -g', { stdio: 'pipe' }).toString().trim();
    if (npmRoot) {
      process.env.NODE_PATH = npmRoot;
      Module._initPaths();
    }
  } catch (error) {
    // Ignore; we'll fall back to normal resolution and show a clear error later if needed
  }
}

let ssh2Module = null;
function getSSH2() {
  if (!ssh2Module) {
    ensureGlobalNodePath();
    try {
      ssh2Module = require('ssh2');
    } catch (error) {
      throw new Error(
        "Module 'ssh2' not found. Install it with `npm install ssh2` or ensure NODE_PATH points to the global npm root."
      );
    }
  }
  return ssh2Module;
}

// SSH Connection Manager
class SSHManager {
  constructor(host, username) {
    this.host = host;
    this.username = username;
    this.conn = null;
    this.sftp = null;
  }

  async connect() {
    const { Client } = getSSH2();
    return new Promise((resolve, reject) => {
      this.conn = new Client();
      
      // Try to find SSH private key
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const privateKeyPath = path.join(homeDir, '.ssh', 'id_rsa');
      const privateKeyPathEd25519 = path.join(homeDir, '.ssh', 'id_ed25519');
      
      let privateKey = null;
      if (fs.existsSync(privateKeyPath)) {
        privateKey = fs.readFileSync(privateKeyPath);
      } else if (fs.existsSync(privateKeyPathEd25519)) {
        privateKey = fs.readFileSync(privateKeyPathEd25519);
      }

      const config = {
        host: this.host,
        username: this.username,
      };

      if (privateKey) {
        config.privateKey = privateKey;
      }

      this.conn.on('ready', () => {
        print.success('SSH connection established');
        this.conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }
          this.sftp = sftp;
          resolve();
        });
      });

      this.conn.on('error', (err) => {
        reject(err);
      });

      this.conn.connect(config);
    });
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      this.conn.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          resolve({
            code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            success: code === 0,
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  async uploadFile(localPath, remotePath) {
    return new Promise((resolve, reject) => {
      this.sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async downloadFile(remotePath, localPath) {
    return new Promise((resolve, reject) => {
      this.sftp.fastGet(remotePath, localPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async disconnect() {
    if (this.sftp) {
      this.sftp.end();
    }
    if (this.conn) {
      this.conn.end();
    }
  }
}

// Find all .env* files in current directory
function findEnvFiles() {
  const currentDir = process.cwd();
  const files = fs.readdirSync(currentDir);
  
  return files
    .filter(file => file.startsWith('.env') && fs.statSync(path.join(currentDir, file)).isFile())
    .map(file => path.join(currentDir, file))
    .sort();
}

// Execute command and return result (for local git operations)
function execCommand(command, options = {}) {
  try {
    execSync(command, { 
      stdio: 'inherit', 
      ...options 
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Ask user to select an option
function askOption(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Upload environment files using SSH
async function uploadEnvFiles(envFiles, sshManager) {
  let uploadedCount = 0;
  let failedCount = 0;

  for (const envFile of envFiles) {
    const filename = path.basename(envFile);
    print.info(`Uploading ${filename}...`);

    try {
      const remotePath = `${APP_PATH}/${filename}`;
      await sshManager.uploadFile(envFile, remotePath);
      print.success(`  ${filename} uploaded successfully`);
      uploadedCount++;
    } catch (error) {
      print.error(`  Failed to upload ${filename}: ${error.message}`);
      failedCount++;
    }
    console.log('');
  }

  // Summary of uploads
  console.log('');
  if (failedCount === 0) {
    print.success(`All environment files updated successfully! (${uploadedCount} file(s))`);
    return true;
  } else {
    print.warning(`Update completed with errors: ${uploadedCount} succeeded, ${failedCount} failed`);
    return false;
  }
}

// Run deploy.sh on remote server
async function runDeployScript(sshManager) {
  print.info('Running deployment script on server...');
  
  try {
    // Make deploy.sh executable
    const chmodResult = await sshManager.execCommand(`cd ${APP_PATH} && chmod +x ${DEPLOY_SCRIPT}`);
    if (!chmodResult.success) {
      print.warning('Failed to make deploy.sh executable, continuing...');
    }

    // Run deploy.sh
    const deployResult = await sshManager.execCommand(`cd ${APP_PATH} && bash ${DEPLOY_SCRIPT}`);
    
    // Output the result
    if (deployResult.stdout) {
      console.log(deployResult.stdout);
    }
    if (deployResult.stderr) {
      console.error(deployResult.stderr);
    }

    return deployResult.success;
  } catch (error) {
    print.error(`Deployment error: ${error.message}`);
    return false;
  }
}

// Backup env files from server to GitHub
async function backupEnvsToGitHub(sshManager) {
  try {
    // Get current working directory name (last part)
    const currentDir = process.cwd();
    const dirName = path.basename(currentDir);
    
    // Generate timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
      .replace('T', '_')
      .substring(0, 15); // Format: YYYYMMDD_HHMMSS
    
    // Create zip file name
    const zipFileName = `${dirName}_${timestamp}.zip`;
    const localZipPath = path.join(currentDir, zipFileName);
    const remoteZipPath = `${APP_PATH}/${zipFileName}`;
    
    print.info('Backing up environment files from server...');
    
    // Step 1: Create zip file on server with all .env* files (including subdirectories)
    print.info('Creating zip file on server (including subdirectories)...');
    
    const zipCommand = `cd ${APP_PATH} && find . -name '.env*' -type f -exec zip -q ${zipFileName} {} + 2>/dev/null || echo 'No env files found'`;
    const zipResult = await sshManager.execCommand(zipCommand);
    
    if (zipResult.stdout.includes('No env files found')) {
      print.error('No .env* files found on server');
      return false;
    }

    // Check if zip file was actually created
    const checkResult = await sshManager.execCommand(`cd ${APP_PATH} && test -f ${zipFileName} && echo 'exists' || echo 'not found'`);
    if (checkResult.stdout.trim() !== 'exists') {
      print.error('No .env* files found on server');
      return false;
    }
    print.success('Zip file created on server');
    
    // Step 2: Download zip file from server
    print.info('Downloading zip file from server...');
    try {
      await sshManager.downloadFile(remoteZipPath, localZipPath);
      print.success('Zip file downloaded');
    } catch (error) {
      print.error(`Failed to download zip file: ${error.message}`);
      // Clean up remote zip file
      await sshManager.execCommand(`cd ${APP_PATH} && rm -f ${zipFileName}`);
      return false;
    }
    
    // Step 3: Clean up remote zip file
    print.info('Cleaning up remote zip file...');
    await sshManager.execCommand(`cd ${APP_PATH} && rm -f ${zipFileName}`);
    
    // Step 4: Git operations - clone, add zip, commit, push
    print.info('Preparing git operations...');
    
    const backupRepoDir = path.join(currentDir, BACKUP_REPO_DIR_NAME);
    const zipInRepoPath = path.join(backupRepoDir, zipFileName);
    
    try {
      // Clone the backup repository
      print.info('Cloning backup repository...');
      if (!execCommand(`git clone ${BACKUP_REPO_URL} ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' })) {
        print.error('Failed to clone backup repository');
        // Clean up local zip file
        if (fs.existsSync(localZipPath)) {
          fs.unlinkSync(localZipPath);
        }
        return false;
      }
      print.success('Repository cloned');
      
      // Move zip file to cloned repository
      print.info('Moving zip file to repository...');
      fs.renameSync(localZipPath, zipInRepoPath);
      print.success('Zip file moved to repository');
      
      // Git add, commit, and push
      print.info('Adding zip file to git...');
      const commitMessage = `${dirName}_${timestamp}`;
      
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git add ${zipFileName}`, { stdio: 'pipe' })) {
        print.error('Failed to add file to git');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('File added to git');
      
      print.info('Committing changes...');
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git commit -m "${commitMessage}"`, { stdio: 'pipe' })) {
        print.error('Failed to commit changes');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('Changes committed');
      
      print.info('Pushing to GitHub...');
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git push origin main`, { stdio: 'pipe' })) {
        print.error('Failed to push to GitHub');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('Pushed to GitHub');
      
      // Step 5: Clean up
      print.info('Cleaning up...');
      if (fs.existsSync(backupRepoDir)) {
        execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
      }
      print.success('Cleanup completed');
      
      return true;
    } catch (error) {
      print.error(`Error during git operations: ${error.message}`);
      // Clean up on error
      if (fs.existsSync(backupRepoDir)) {
        execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
      }
      if (fs.existsSync(localZipPath)) {
        fs.unlinkSync(localZipPath);
      }
      return false;
    }
  } catch (error) {
    print.error(`Error during backup: ${error.message}`);
    return false;
  }
}

// Backup env files from local system to GitHub
async function backupEnvsToGitHubFromLocal() {
  try {
    // Get current working directory name (last part)
    const currentDir = process.cwd();
    const dirName = path.basename(currentDir);
    
    // Generate timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
      .replace('T', '_')
      .substring(0, 15); // Format: YYYYMMDD_HHMMSS
    
    // Create zip file name
    const zipFileName = `${dirName}_${timestamp}.zip`;
    const localZipPath = path.join(currentDir, zipFileName);
    
    print.info('Backing up environment files from local system...');
    
    // Step 1: Create zip file locally with all .env* files (including subdirectories)
    print.info('Creating zip file locally (including subdirectories)...');
    
    const zipCommand = `find . -name '.env*' -type f -exec zip -q ${zipFileName} {} + 2>/dev/null || echo 'No env files found'`;
    const zipSuccess = execCommand(zipCommand, { stdio: 'pipe' });
    
    if (!zipSuccess) {
      print.error('Failed to create zip file');
      return false;
    }
    
    // Check if zip file was actually created
    if (!fs.existsSync(localZipPath)) {
      print.error('No .env* files found locally');
      return false;
    }
    print.success('Zip file created locally');
    
    // Step 2: Git operations - clone, add zip, commit, push
    print.info('Preparing git operations...');
    
    const backupRepoDir = path.join(currentDir, BACKUP_REPO_DIR_NAME);
    const zipInRepoPath = path.join(backupRepoDir, zipFileName);
    
    try {
      // Clone the backup repository
      print.info('Cloning backup repository...');
      if (!execCommand(`git clone ${BACKUP_REPO_URL} ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' })) {
        print.error('Failed to clone backup repository');
        // Clean up local zip file
        if (fs.existsSync(localZipPath)) {
          fs.unlinkSync(localZipPath);
        }
        return false;
      }
      print.success('Repository cloned');
      
      // Move zip file to cloned repository
      print.info('Moving zip file to repository...');
      fs.renameSync(localZipPath, zipInRepoPath);
      print.success('Zip file moved to repository');
      
      // Git add, commit, and push
      print.info('Adding zip file to git...');
      const commitMessage = `${dirName}_${timestamp}`;
      
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git add ${zipFileName}`, { stdio: 'pipe' })) {
        print.error('Failed to add file to git');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('File added to git');
      
      print.info('Committing changes...');
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git commit -m "${commitMessage}"`, { stdio: 'pipe' })) {
        print.error('Failed to commit changes');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('Changes committed');
      
      print.info('Pushing to GitHub...');
      if (!execCommand(`cd ${BACKUP_REPO_DIR_NAME} && git push origin main`, { stdio: 'pipe' })) {
        print.error('Failed to push to GitHub');
        // Clean up
        if (fs.existsSync(backupRepoDir)) {
          execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
        }
        return false;
      }
      print.success('Pushed to GitHub');
      
      // Step 3: Clean up
      print.info('Cleaning up...');
      if (fs.existsSync(backupRepoDir)) {
        execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
      }
      print.success('Cleanup completed');
      
      return true;
    } catch (error) {
      print.error(`Error during git operations: ${error.message}`);
      // Clean up on error
      if (fs.existsSync(backupRepoDir)) {
        execCommand(`rm -rf ${BACKUP_REPO_DIR_NAME}`, { stdio: 'pipe' });
      }
      if (fs.existsSync(localZipPath)) {
        fs.unlinkSync(localZipPath);
      }
      return false;
    }
  } catch (error) {
    print.error(`Error during backup: ${error.message}`);
    return false;
  }
}

// Download latest env backup from GitHub and extract locally
async function downloadEnvsFromGitHub() {
  const currentDir = process.cwd();
  const cloneDir = path.join(currentDir, BACKUP_REPO_DOWNLOAD_DIR_NAME);

  const cleanup = () => {
    if (fs.existsSync(cloneDir)) {
      execCommand(`rm -rf ${cloneDir}`, { stdio: 'pipe' });
    }
  };

  try {
    print.info('Preparing to download env backups from GitHub...');

    // Ensure no previous clone exists
    cleanup();

    print.info('Cloning backup repository...');
    if (!execCommand(`git clone ${BACKUP_REPO_URL} ${cloneDir}`, { stdio: 'pipe' })) {
      print.error('Failed to clone backup repository');
      return false;
    }
    print.success('Repository cloned');

    const files = fs.readdirSync(cloneDir)
      .filter((file) => file.startsWith(BACKUP_FILENAME_PREFIX) && file.endsWith('.zip'));

    if (files.length === 0) {
      print.error('No subvivah*.zip backups found in repository');
      cleanup();
      return false;
    }

    const latestFile = files
      .map((file) => {
        const filePath = path.join(cloneDir, file);
        const stats = fs.statSync(filePath);
        return { file, time: stats.mtimeMs };
      })
      .sort((a, b) => b.time - a.time)[0].file;

    print.info(`Latest backup found: ${latestFile}`);

    const zipPath = path.join(cloneDir, latestFile);
    print.info('Extracting backup to project root...');

    if (!execCommand(`unzip -o ${zipPath} -d ${currentDir}`)) {
      print.error('Failed to extract backup');
      cleanup();
      return false;
    }

    print.success('Backup extracted successfully');

    cleanup();
    print.success('Cleanup completed');
    return true;
  } catch (error) {
    print.error(`Error while downloading backup: ${error.message}`);
    cleanup();
    return false;
  }
}

// Main function
async function main() {
  let sshManager = null;
  
  try {
    // Display info
    print.info('Host Deployment Script');
    print.info('====================================');
    print.info(`Server: ${SERVER_USER}@${SERVER_HOST}`);
    print.info(`App Path: ${APP_PATH}`);
    console.log('');

    // Show options menu
    console.log('Select an option:');
console.log('  1. sync env files to the server');
console.log('  2. Run deploy.sh in the server');
console.log('  3. Backup envs to GitHub from the server');
console.log('  4. Backup envs to GitHub from local');
console.log('  5. Download latest envs backup from GitHub');
    console.log('');

const option = await askOption('Enter your choice (1, 2, 3, 4, or 5): ');
    console.log('');

if (!['1', '2', '3', '4', '5'].includes(option)) {
  print.error('Invalid option. Please choose 1, 2, 3, 4, or 5.');
      process.exit(1);
    }

    console.log('');

// Connect to SSH server (needed for options 1, 2, and 3)
if (['1', '2', '3'].includes(option)) {
      print.info('Connecting to server...');
      sshManager = new SSHManager(SERVER_HOST, SERVER_USER);
      await sshManager.connect();
    }

    // Option 1: Update env files
    if (option === '1') {
      // Find all .env* files
      const envFiles = findEnvFiles();

      if (envFiles.length === 0) {
        print.error('No .env* files found in current directory');
        print.info('Please create .env or .env.* files');
        await sshManager.disconnect();
        process.exit(1);
      }

      print.info(`Found ${envFiles.length} environment file(s):`);
      envFiles.forEach(file => {
        print.info(`  - ${path.basename(file)}`);
      });
      console.log('');

      // Upload environment files
      const uploadSuccess = await uploadEnvFiles(envFiles, sshManager);

      if (!uploadSuccess) {
        await sshManager.disconnect();
        process.exit(1);
      }

      print.info('Environment files updated successfully.');
    }

    // Option 2: Run deploy.sh
    if (option === '2') {
      if (await runDeployScript(sshManager)) {
        print.success('Deployment completed successfully!');
      } else {
        print.error('Deployment failed');
        await sshManager.disconnect();
        process.exit(1);
      }
    }

    // Option 3: Backup envs to GitHub
    if (option === '3') {
      if (await backupEnvsToGitHub(sshManager)) {
        print.success('Backup completed successfully!');
      } else {
        print.error('Backup failed');
        await sshManager.disconnect();
        process.exit(1);
      }
    }

    // Option 4: Backup envs to GitHub from local
    if (option === '4') {
      if (await backupEnvsToGitHubFromLocal()) {
        print.success('Backup completed successfully!');
      } else {
        print.error('Backup failed');
        process.exit(1);
      }
    }

// Option 5: Download envs from GitHub
if (option === '5') {
  if (await downloadEnvsFromGitHub()) {
    print.success('Environments downloaded successfully!');
  } else {
    print.error('Download failed');
    process.exit(1);
  }
}

    // Disconnect from SSH (only if connected)
    if (sshManager) {
      await sshManager.disconnect();
      print.success('Disconnected from server');
    }
  } catch (error) {
    print.error(`Error: ${error.message}`);
    if (sshManager) {
      await sshManager.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
main();


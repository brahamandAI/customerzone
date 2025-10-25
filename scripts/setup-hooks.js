#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up hooks...\n');

// Check if .git directory exists
if (!fs.existsSync('.git')) {
    console.error('❌ Error: .git directory not found. Make sure you are in a Git repository.');
    process.exit(1);
}

// Check if .env.git file exists
if (!fs.existsSync('.env.git')) {
    console.error('❌ Error: .env.git file not found!');
    process.exit(1);
}
console.log('✅ .env.git file found');

// Check and decrypt .env.production files in frontend and backend if needed
const envFiles = [
    'frontend/.env.production',
    'backend/.env.production'
];

let allFilesExist = true;

for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) {
        allFilesExist = false;
        const encryptedFile = envFile + '.encrypted';
        if (fs.existsSync(encryptedFile)) {
            console.log(`🔓 ${envFile} not found, attempting to decrypt from ${encryptedFile}...`);
            try {
                const { execSync } = require('child_process');
                execSync(`node scripts/env-manager.js decrypt ${encryptedFile}`, { 
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                console.log(`✅ ${envFile} decrypted successfully`);
                allFilesExist = true;
            } catch (error) {
                console.error(`❌ Error: Failed to decrypt ${encryptedFile}`);
                console.error(`Please manually run: node scripts/env-manager.js decrypt ${encryptedFile}`);
            }
        } else {
            console.error(`❌ Error: ${envFile} not found and ${encryptedFile} does not exist`);
            console.error(`Please create ${envFile} before setting up hooks`);
        }
    } else {
        console.log(`✅ ${envFile} file found`);
    }
}

// Exit if required files don't exist
if (!allFilesExist) {
    console.error('\n❌ Setup failed: Missing required .env.production files');
    console.error('Please ensure both frontend/.env.production and backend/.env.production exist');
    process.exit(1);
}

// Create .git/hooks directory if it doesn't exist
const hooksDir = path.join('.git', 'hooks');
if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
    console.log('📁 Created .git/hooks directory');
}

// Create the pre-commit hook
const preCommitHook = `#!/usr/bin/env node

// Cross-platform pre-commit hook
const { execSync } = require('child_process');

try {
    // Run the pre-commit check
    execSync('node scripts/pre-commit-check.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
    });
} catch (error) {
    console.error('\\n❌ Pre-commit check failed. Commit aborted.');
    process.exit(1);
}
`;

// Write the hook file
const hookPath = path.join(hooksDir, 'pre-commit');
fs.writeFileSync(hookPath, preCommitHook);

// Make it executable (Unix-like systems)
if (process.platform !== 'win32') {
    try {
        fs.chmodSync(hookPath, '755');
    } catch (error) {
        console.warn('⚠️  Warning: Could not make hook executable:', error.message);
    }
}

// Create the pre-push hook
const prePushHook = `#!/usr/bin/env node

// Cross-platform pre-push hook
const { execSync } = require('child_process');

try {
    // Run the pre-push check
    execSync('node scripts/pre-push-check.js "$@"', { 
        stdio: 'inherit',
        cwd: process.cwd()
    });
} catch (error) {
    console.error('\\n❌ Pre-push check failed. Push aborted.');
    process.exit(1);
}
`;

// Write the pre-push hook file
const prePushHookPath = path.join(hooksDir, 'pre-push');
fs.writeFileSync(prePushHookPath, prePushHook);

// Make it executable (Unix-like systems)
if (process.platform !== 'win32') {
    try {
        fs.chmodSync(prePushHookPath, '755');
    } catch (error) {
        console.warn('⚠️  Warning: Could not make pre-push hook executable:', error.message);
    }
}

console.log('✅ Pre-commit hook installed successfully!');
console.log('✅ Pre-push hook installed successfully!');
console.log('📝 The hooks will now run automatically:');
console.log('   • Pre-commit: Checks frontend/.env.production and backend/.env.production, ENCRYPTION_KEY, and encrypts env files');
console.log('   • Pre-push: Runs comprehensive safety checks before pushing');
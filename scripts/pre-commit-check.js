#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envFiles = [
    'frontend/.env.production',
    'backend/.env.production'
];

console.log('🔍 Running pre-commit checks...\n');

// Check 1: .env.production files exist
for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) {
        console.error(`❌ Error: ${envFile} file is missing!`);
        console.error('✍️ Please create this file before committing.');
        console.error('or 👉 RUN node scripts/env-manager.js decrypt <file>.encrypted');
        process.exit(1);
    }
    console.log(`✅ ${envFile} file exists`);
}

// Check 2: .env.git exists and contains ENCRYPTION_KEY
if (!fs.existsSync('.env.git')) {
    console.error('❌ Error: .env.git file is missing!');
    console.error('Please create .env.git with ENCRYPTION_KEY before committing.');
    process.exit(1);
}

const envGitContent = fs.readFileSync('.env.git', 'utf8');
if (!envGitContent.includes('ENCRYPTION_KEY=')) {
    console.error('❌ Error: ENCRYPTION_KEY not found in .env.git!');
    console.error('Please add ENCRYPTION_KEY to .env.git before committing.');
    process.exit(1);
}
console.log('✅ ENCRYPTION_KEY found in .env.git');

// Check 3: Run encryption for each .env.production file
for (const envFile of envFiles) {
    try {
        console.log(`🔐 Encrypting ${envFile}...`);
        execSync(`node scripts/env-manager.js encrypt ${envFile}`, { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log(`✅ ${envFile} encrypted successfully`);
        
        // Stage the encrypted file so it's included in the commit
        const encryptedFile = envFile + '.encrypted';
        execSync(`git add ${encryptedFile}`, {
            cwd: process.cwd(),
            stdio: 'inherit'
        });
        console.log(`✅ ${encryptedFile} staged for commit`);
    } catch (error) {
        console.error(`❌ Error: Failed to encrypt ${envFile}`);
        console.error('Encryption error:', error.message);
        process.exit(1);
    }
}

console.log('\n🎉 All pre-commit checks passed! Ready to commit.');
process.exit(0);

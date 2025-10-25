#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

// Load .env.git and get ENCRYPTION_KEY
function loadEnvGit() {
    if (!fs.existsSync('.env.git')) {
        console.error('❌ .env.git file not found.');
        console.error('Please create .env.git with ENCRYPTION_KEY variable.');
        process.exit(1);
    }
    
    const content = fs.readFileSync('.env.git', 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^ENCRYPTION_KEY=(.+)$/);
            if (match) {
                return match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            }
        }
    }
    
    console.error('❌ ENCRYPTION_KEY not found in .env.git');
    process.exit(1);
}

// Generate a new encryption key
function createKey() {
    const key = crypto.randomBytes(32).toString('hex');
    
    // Update .env.git with new key
    let content = '';
    if (fs.existsSync('.env.git')) {
        content = fs.readFileSync('.env.git', 'utf8');
    }
    
    // Check if ENCRYPTION_KEY already exists in .env.git
    const lines = content.split('\n');
    let found = false;
    const newLines = lines.map(line => {
        if (line.trim().startsWith('ENCRYPTION_KEY=')) {
            found = true;
            return `ENCRYPTION_KEY=${key}`;
        }
        return line;
    });
    
    if (!found) {
        newLines.push(`ENCRYPTION_KEY=${key}`);
    }
    
    fs.writeFileSync('.env.git', newLines.join('\n'));
    console.log('✅ Encryption key created and saved to .env.git');
}

// Load key from .env.git
function loadKey() {
    return loadEnvGit();
}

// Encrypt a file
function encrypt(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    
    const key = loadKey();
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Create a random IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    const result = iv.toString('hex') + ':' + encrypted;
    
    const outputPath = filePath + '.encrypted';
    fs.writeFileSync(outputPath, result);
    console.log(`✅ File encrypted: ${outputPath}`);
}

// Decrypt a file
function decrypt(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    
    const key = loadKey();
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    
    // Split IV and encrypted content
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
        console.error('❌ Invalid encrypted file format. Expected format: IV:encrypted_data');
        process.exit(1);
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const outputPath = filePath.replace('.encrypted', '');
        fs.writeFileSync(outputPath, decrypted);
        console.log(`✅ File decrypted: ${outputPath}`);
    } catch (error) {
        console.error('❌ Failed to decrypt file. The file may be corrupted or encrypted with a different key.');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Main function
const command = process.argv[2];
const file = process.argv[3];

switch (command) {
    case 'create-key':
        createKey();
        break;
    case 'encrypt':
        if (!file) {
            console.error('❌ Please specify a file: node scripts/env-manager.js encrypt <file>');
            process.exit(1);
        }
        encrypt(file);
        break;
    case 'decrypt':
        if (!file) {
            console.error('❌ Please specify a file: node scripts/env-manager.js decrypt <file>');
            process.exit(1);
        }
        decrypt(file);
        break;
    default:
        console.log(`
🔧 Simple Environment Manager

Usage:
  node scripts/env-manager.js create-key
  node scripts/env-manager.js encrypt <file>
  node scripts/env-manager.js decrypt <file>

Examples:
  node scripts/env-manager.js create-key
  node scripts/env-manager.js encrypt .env.production
  node scripts/env-manager.js decrypt .env.production.encrypted
        `);
}

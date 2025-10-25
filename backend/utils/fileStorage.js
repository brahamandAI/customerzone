const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class FileStorage {
  constructor() {
    this.baseUploadDir = path.join(__dirname, '..', 'uploads');
    this.expenseUploadDir = path.join(this.baseUploadDir, 'expenses');
    this.profileUploadDir = path.join(this.baseUploadDir, 'profiles');
    
    // Create directories if they don't exist
    this.ensureDirectories();
  }

  // Ensure all required directories exist
  ensureDirectories() {
    const directories = [
      this.baseUploadDir,
      this.expenseUploadDir,
      this.profileUploadDir
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  // Generate organized file path
  generateFilePath(fileType = 'expense', originalName) {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Create year/month structure
    const yearMonthDir = path.join(year, month);
    const fullDir = path.join(this.expenseUploadDir, yearMonthDir);
    
    // Ensure directory exists
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(originalName);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const filename = `${timestamp}_${uniqueId}${fileExtension}`;
    
    return {
      relativePath: path.join('expenses', yearMonthDir, filename),
      fullPath: path.join(fullDir, filename),
      filename: filename,
      originalName: originalName
    };
  }

  // Save uploaded file
  async saveFile(file, fileType = 'expense') {
    try {
      // For multer, file is already saved, just return the info
      const stats = fs.statSync(file.path);
      
      return {
        success: true,
        data: {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path.replace(/\\/g, '/'), // Normalize path separators
          fullPath: file.path,
          size: stats.size,
          mimetype: file.mimetype,
          uploadDate: new Date(),
          fileType: fileType
        }
      };
    } catch (error) {
      console.error('Error saving file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.baseUploadDir, filePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Deleted file: ${fullPath}`);
        return { success: true };
      } else {
        console.log(`⚠️ File not found: ${fullPath}`);
        return { success: false, error: 'File not found' };
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  }

  // Get file info
  getFileInfo(filePath) {
    try {
      const fullPath = path.join(this.baseUploadDir, filePath);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return {
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('Error getting file info:', error);
      return { exists: false, error: error.message };
    }
  }

  // Validate file
  validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const maxSize = (Number(process.env.UPLOAD_MAX_MB || 25)) * 1024 * 1024; // default 25MB; env configurable

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file size
    if (file.size > maxSize) {
      const limitMb = Number(process.env.UPLOAD_MAX_MB || 25);
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${limitMb}MB`);
    }

    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Clean up old files (optional)
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const cleanupDir = this.expenseUploadDir;
      let deletedCount = 0;

      const cleanupDirectory = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
              cleanupDirectory(filePath);
            } else if (stats.mtime < cutoffDate) {
              fs.unlinkSync(filePath);
              deletedCount++;
              console.log(`🗑️ Cleaned up old file: ${filePath}`);
            }
          });
        }
      };

      cleanupDirectory(cleanupDir);
      console.log(`🧹 Cleanup completed. Deleted ${deletedCount} old files.`);
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileStorage(); 
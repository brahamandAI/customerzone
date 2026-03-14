const path = require('path');
const backendDir = '/home/ubuntu/htdocs/customerzone/backend';
const frontendDir = '/home/ubuntu/htdocs/customerzone/frontend';

module.exports = {
  apps: [
    {
      name: 'expense-backend',
      cwd: backendDir,
      script: 'server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      // Use PM2 default logs (~/.pm2/logs/) so output is always captured even if backend/logs/ missing
      error_file: path.join(process.env.HOME || '/home/ubuntu', '.pm2', 'logs', 'expense-backend-error.log'),
      out_file: path.join(process.env.HOME || '/home/ubuntu', '.pm2', 'logs', 'expense-backend-out.log'),
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      kill_timeout: 5000,
      listen_timeout: 30000,
      watch: false,
    },
    {
      name: 'expense-frontend',
      cwd: frontendDir,
      script: 'npx',
      args: 'serve -s build -l 3003',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      error_file: path.join(process.env.HOME || '/home/ubuntu', '.pm2', 'logs', 'expense-frontend-error.log'),
      out_file: path.join(process.env.HOME || '/home/ubuntu', '.pm2', 'logs', 'expense-frontend-out.log'),
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      kill_timeout: 5000,
      listen_timeout: 30000,
      watch: false,
    },
  ],
};

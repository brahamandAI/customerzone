module.exports = {
  apps: [
    {
      name: 'expense-backend',
      
      // ---- WORKING DIRECTORY ----
      cwd: '/home/ubuntu/htdocs/customerzone/backend',
      
      // ---- START USING PNPM (IMPORTANT) ----
      script: '/usr/local/bin/pnpm',
      args: 'start',
      interpreter: 'node',
      
      // ---- ABSOLUTE SAFETY ----
      instances: 1,          // NEVER > 1
      exec_mode: 'fork',     // NEVER cluster
      
      // ---- RESTART CONTROL ----
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,       // 5 seconds delay
      exp_backoff_restart_delay: 200, // exponential backoff
      
      // ---- HARD MEMORY LIMIT ----
      max_memory_restart: '1G',
      
      // ---- ENV ----
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      
      // ---- LOGGING (LOCAL, ROTATABLE) ----
      error_file: '/home/ubuntu/htdocs/customerzone/backend/logs/backend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/backend/logs/backend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/backend/logs/backend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // ---- SHUTDOWN SAFETY ----
      kill_timeout: 5000,
      listen_timeout: 30000,
      wait_ready: false,
      watch: false
    },
    {
      name: 'expense-frontend',
      
      // ---- WORKING DIRECTORY ----
      cwd: '/home/ubuntu/htdocs/customerzone/frontend',
      
      // ---- START USING PNPM (IMPORTANT) ----
      script: '/usr/local/bin/pnpm',
      args: 'serve',
      interpreter: 'node',
      
      // ---- ABSOLUTE SAFETY ----
      instances: 1,          // NEVER > 1
      exec_mode: 'fork',     // NEVER cluster
      
      // ---- RESTART CONTROL ----
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,       // 5 seconds delay
      exp_backoff_restart_delay: 200, // exponential backoff
      
      // ---- HARD MEMORY LIMIT ----
      max_memory_restart: '1G',
      
      // ---- ENV ----
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      
      // ---- LOGGING (LOCAL, ROTATABLE) ----
      error_file: '/home/ubuntu/htdocs/customerzone/backend/logs/frontend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/backend/logs/frontend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/backend/logs/frontend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // ---- SHUTDOWN SAFETY ----
      kill_timeout: 5000,
      listen_timeout: 30000,
      wait_ready: false,
      watch: false
    }
  ]
}; 
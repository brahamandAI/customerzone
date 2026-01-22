module.exports = {
  apps: [
    {
      name: 'expense-backend',
      
      // ---- WORKING DIRECTORY ----
      cwd: '/home/ubuntu/htdocs/customerzone/backend',
      
      // ---- START USING PNPM (IMPORTANT) ----
      script: '/home/ubuntu/.local/share/pnpm/pnpm',
      args: 'start',
      interpreter: 'sh',
      
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
        PORT: 5001,
        FRONTEND_URL: 'https://customerzone.in,https://www.customerzone.in'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        FRONTEND_URL: 'https://customerzone.in,https://www.customerzone.in'
      },
      
      // ---- LOGGING (LOCAL, ROTATABLE) ----
      error_file: '/home/ubuntu/htdocs/customerzone/logs/backend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/logs/backend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/logs/backend-combined.log',
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
      script: '/home/ubuntu/.local/share/pnpm/pnpm',
      args: 'serve',
      interpreter: 'sh',
      
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
      error_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-combined.log',
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
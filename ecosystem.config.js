module.exports = {
  apps: [
    {
      name: 'expense-backend',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/htdocs/customerzone/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 5,
      restart_delay: 5000,       // 5 seconds delay
      exp_backoff_restart_delay: 200, // exponential backoff
      error_file: '/home/ubuntu/htdocs/customerzone/logs/backend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/logs/backend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/logs/backend-combined.log',
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      }
    },
    {
      name: 'expense-frontend',
      script: 'npx',
      args: 'serve -s build -l 3003',
      cwd: '/home/ubuntu/htdocs/customerzone/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 5,
      restart_delay: 5000,       // 5 seconds delay
      exp_backoff_restart_delay: 200, // exponential backoff
      error_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-error.log',
      out_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-out.log',
      log_file: '/home/ubuntu/htdocs/customerzone/logs/frontend-combined.log',
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    }
  ]
}; 
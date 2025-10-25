module.exports = {
  apps: [
    {
      name: 'expense-frontend',
      script: 'npx',
      args: 'serve -s build -l 3002',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}; 
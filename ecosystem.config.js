module.exports = {
  apps: [
    {
      name: 'fiflow-web',
      cwd: '/var/www/html/fiflow/web',
      script: 'node',
      args: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}

module.exports = {
  apps: [
    {
      name: 'bodeguita-backend',
      script: 'npm',
      args: 'run start:prod',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'bodeguita-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};

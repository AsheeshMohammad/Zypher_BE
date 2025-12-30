import swaggerJsdoc from 'swagger-jsdoc';

const getServers = () => {
  const servers = [];

  // Relative string for current host
  servers.push({
    url: '/',
    description: 'Current Server (Relative)',
  });

  // Production server
  if (process.env.API_URL) {
    servers.push({
      url: process.env.API_URL,
      description: 'Production server',
    });
  }

  // Development servers
  servers.push(
    {
      url: 'http://localhost:3000',
      description: 'Development server (Express)',
    },
    {
      url: 'http://localhost:5173',
      description: 'Development server (Vite)',
    }
  );

  return servers;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZYPHER Backend API',
      version: '1.0.0',
      description: 'A simple Express API with JWT authentication',
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const specs = swaggerJsdoc(options);
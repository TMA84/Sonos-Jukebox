export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Sonos Jukebox API',
    version: '3.0.0',
    description: 'API documentation for Sonos Jukebox - A kid-friendly jukebox interface',
    contact: {
      name: 'API Support',
      url: 'https://github.com/TMA84/sonos-jukebox',
    },
  },
  servers: [
    {
      url: 'http://localhost:8200',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          room: { type: 'string' },
          enableSpeakerSelection: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MediaItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          clientId: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          artist: { type: 'string' },
          cover: { type: 'string' },
          spotifyUri: { type: 'string' },
          spotifyId: { type: 'string' },
          metadata: { type: 'object' },
          playCount: { type: 'number' },
          lastPlayedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Clients', description: 'Client management' },
    { name: 'Media', description: 'Media library management' },
    { name: 'Config', description: 'Configuration management' },
    { name: 'Spotify', description: 'Spotify integration' },
    { name: 'Sonos', description: 'Sonos speaker control' },
  ],
};

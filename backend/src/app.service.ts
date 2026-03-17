import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getWelcome(): object {
    return {
      success: true,
      message: 'Welcome to Stampworth Backend API',
      version: '1.0.0',
      documentation: 'Available at /api/docs',
    };
  }
}

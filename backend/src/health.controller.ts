import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): object {
    return { success: true, status: 'ok', timestamp: new Date().toISOString() };
  }
}

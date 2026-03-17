import { Module } from '@nestjs/common';
import { StampsService } from './stamps.service';
import { StampsController } from './stamps.controller';

@Module({
  controllers: [StampsController],
  providers: [StampsService],
  exports: [StampsService],
})
export class StampsModule {}

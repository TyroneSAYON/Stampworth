import { Module } from '@nestjs/common';
import { QRCodesService } from './qr-codes.service';
import { QRCodesController } from './qr-codes.controller';

@Module({
  controllers: [QRCodesController],
  providers: [QRCodesService],
  exports: [QRCodesService],
})
export class QRCodesModule {}

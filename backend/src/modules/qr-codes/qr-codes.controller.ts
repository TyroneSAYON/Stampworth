import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { QRCodesService } from './qr-codes.service';
import { CreateQRCodeDto } from './dto/create-qr-code.dto';

@Controller('api/qr-codes')
export class QRCodesController {
  constructor(private qrCodesService: QRCodesService) {}

  @Post()
  createQRCode(@Body() createQRDto: CreateQRCodeDto) {
    return this.qrCodesService.createQRCode(createQRDto);
  }

  @Get('business/:businessId')
  getBusinessQRCodes(@Param('businessId') businessId: string) {
    return this.qrCodesService.getBusinessQRCodes(businessId);
  }

  @Post('validate/:codeValue')
  validateQRCode(@Param('codeValue') codeValue: string) {
    return this.qrCodesService.validateQRCode(codeValue);
  }

  @Patch(':id/deactivate')
  deactivateQRCode(@Param('id') id: string) {
    return this.qrCodesService.deactivateQRCode(id);
  }

  @Post('customer/:userId')
  generateCustomerQRCode(
    @Param('userId') userId: string,
    @Body('qrCodeValue') qrCodeValue: string,
    @Body('qrCodeImageUrl') qrCodeImageUrl?: string,
  ) {
    return this.qrCodesService.generateCustomerQRCode(userId, qrCodeValue, qrCodeImageUrl);
  }

  @Get('customer/:userId')
  getUserCustomerQRCodes(@Param('userId') userId: string) {
    return this.qrCodesService.getUserCustomerQRCodes(userId);
  }
}

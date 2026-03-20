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

  @Get('merchant/:merchantId')
  getBusinessQRCodes(@Param('merchantId') merchantId: string) {
    return this.qrCodesService.getBusinessQRCodes(merchantId);
  }

  @Post('validate/:codeValue')
  validateQRCode(@Param('codeValue') codeValue: string) {
    return this.qrCodesService.validateQRCode(codeValue);
  }

  @Patch(':id/deactivate')
  deactivateQRCode(@Param('id') id: string) {
    return this.qrCodesService.deactivateQRCode(id);
  }

  @Post('customer/:customerId')
  generateCustomerQRCode(
    @Param('customerId') customerId: string,
    @Body('qrCodeValue') qrCodeValue: string,
    @Body('qrCodeImageUrl') qrCodeImageUrl?: string,
  ) {
    return this.qrCodesService.generateCustomerQRCode(customerId, qrCodeValue, qrCodeImageUrl);
  }

  @Get('customer/:customerId')
  getUserCustomerQRCodes(@Param('customerId') customerId: string) {
    return this.qrCodesService.getUserCustomerQRCodes(customerId);
  }
}

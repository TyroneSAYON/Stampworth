import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { StampsService } from './stamps.service';
import { CreateStampDto } from './dto/create-stamp.dto';

@Controller('api/stamps')
export class StampsController {
  constructor(private stampsService: StampsService) {}

  @Post()
  addStamp(@Body() createStampDto: CreateStampDto) {
    return this.stampsService.addStamp(createStampDto);
  }

  @Get('card/:loyaltyCardId')
  getCardStamps(@Param('loyaltyCardId') loyaltyCardId: string) {
    return this.stampsService.getCardStamps(loyaltyCardId);
  }

  @Get('user/:userId')
  getUserStamps(@Param('userId') userId: string) {
    return this.stampsService.getUserStamps(userId);
  }

  @Get('business/:businessId')
  getBusinessStamps(@Param('businessId') businessId: string) {
    return this.stampsService.getBusinessStamps(businessId);
  }
}

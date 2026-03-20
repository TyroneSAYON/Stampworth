import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/create-business.dto';

@Controller('api/businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get()
  getAllBusinesses() {
    return this.businessesService.getAllBusinesses();
  }

  @Get(':id')
  getBusinessById(@Param('id') id: string) {
    return this.businessesService.getBusinessById(id);
  }

  @Get('email/:email')
  getBusinessByEmail(@Param('email') email: string) {
    return this.businessesService.getBusinessByEmail(email);
  }

  @Put(':id')
  updateBusiness(@Param('id') id: string, @Body() updateDto: UpdateBusinessDto) {
    return this.businessesService.updateBusiness(id, updateDto);
  }

  @Get(':id/stats')
  getBusinessStats(@Param('id') id: string) {
    return this.businessesService.getBusinessStats(id);
  }

  @Put(':id/loyalty-settings')
  saveLoyaltyConfiguration(@Param('id') id: string, @Body() config: any) {
    return this.businessesService.saveLoyaltyConfiguration(id, config);
  }

  @Get(':id/loyalty-settings')
  getLoyaltyConfiguration(@Param('id') id: string) {
    return this.businessesService.getLoyaltyConfiguration(id);
  }

  @Post(':id/announcements')
  createAnnouncement(@Param('id') id: string, @Body('message') message: string) {
    return this.businessesService.createAnnouncement(id, message);
  }

  @Get(':id/announcements')
  getBusinessAnnouncements(@Param('id') id: string) {
    return this.businessesService.getBusinessAnnouncements(id);
  }

  @Get('customer/:customerId/announcements')
  getCustomerAnnouncements(@Param('customerId') customerId: string) {
    return this.businessesService.getCustomerAnnouncements(customerId);
  }
}

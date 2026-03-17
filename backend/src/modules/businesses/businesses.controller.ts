import { Controller, Get, Put, Param, Body } from '@nestjs/common';
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
}

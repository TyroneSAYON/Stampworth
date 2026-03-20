import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('api/locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('nearby-stores')
  findNearbyStores(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('maxDistance') maxDistance?: number,
  ) {
    return this.locationsService.findNearbyStores(latitude, longitude, maxDistance);
  }

  @Get('nearby-customers/:merchantId')
  findNearbyUsers(
    @Param('merchantId') merchantId: string,
    @Query('maxDistance') maxDistance?: number,
  ) {
    return this.locationsService.findNearbyUsers(merchantId, maxDistance);
  }

  @Post('check-geofence')
  checkGeofence(
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('merchantId') merchantId: string,
  ) {
    return this.locationsService.checkGeofence(latitude, longitude, merchantId);
  }

  @Post('update-location')
  updateUserLocation(
    @Body('customerId') customerId: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('accuracy') accuracy?: number,
  ) {
    return this.locationsService.updateUserLocation(customerId, latitude, longitude, accuracy);
  }

  @Get('store-visits/:merchantId')
  getStoreVisits(@Param('merchantId') merchantId: string) {
    return this.locationsService.getStoreVisits(merchantId);
  }

  @Post('store-visit')
  createStoreVisit(
    @Body('customerId') customerId: string,
    @Body('merchantId') merchantId: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.locationsService.createStoreVisit(customerId, merchantId, latitude, longitude);
  }
}

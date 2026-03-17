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

  @Get('nearby-users/:businessId')
  findNearbyUsers(
    @Param('businessId') businessId: string,
    @Query('maxDistance') maxDistance?: number,
  ) {
    return this.locationsService.findNearbyUsers(businessId, maxDistance);
  }

  @Post('check-geofence')
  checkGeofence(
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('businessId') businessId: string,
  ) {
    return this.locationsService.checkGeofence(latitude, longitude, businessId);
  }

  @Post('update-location')
  updateUserLocation(
    @Body('userId') userId: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('accuracy') accuracy?: number,
  ) {
    return this.locationsService.updateUserLocation(userId, latitude, longitude, accuracy);
  }

  @Get('store-visits/:businessId')
  getStoreVisits(@Param('businessId') businessId: string) {
    return this.locationsService.getStoreVisits(businessId);
  }

  @Post('store-visit')
  createStoreVisit(
    @Body('userId') userId: string,
    @Body('businessId') businessId: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.locationsService.createStoreVisit(userId, businessId, latitude, longitude);
  }
}

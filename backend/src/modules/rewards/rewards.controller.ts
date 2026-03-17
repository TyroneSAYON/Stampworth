import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { RewardsService } from './rewards.service';

@Controller('api/rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Post('redeem')
  redeemReward(
    @Body('loyaltyCardId') loyaltyCardId: string,
    @Body('businessId') businessId: string,
    @Body('userId') userId: string,
    @Body('stampsUsed') stampsUsed: number,
  ) {
    return this.rewardsService.redeemReward(loyaltyCardId, businessId, userId, stampsUsed);
  }

  @Get('user/:userId')
  getUserRewards(@Param('userId') userId: string) {
    return this.rewardsService.getUserRewards(userId);
  }

  @Get('business/:businessId')
  getBusinessRewards(@Param('businessId') businessId: string) {
    return this.rewardsService.getBusinessRewards(businessId);
  }

  @Get('validate/:rewardCode')
  validateRewardCode(@Param('rewardCode') rewardCode: string) {
    return this.rewardsService.validateRewardCode(rewardCode);
  }

  @Post(':rewardCode/use')
  useRewardCode(@Param('rewardCode') rewardCode: string) {
    return this.rewardsService.useRewardCode(rewardCode);
  }
}

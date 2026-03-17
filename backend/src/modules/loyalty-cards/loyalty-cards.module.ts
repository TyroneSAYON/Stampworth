import { Module } from '@nestjs/common';
import { LoyaltyCardsService } from './loyalty-cards.service';
import { LoyaltyCardsController } from './loyalty-cards.controller';

@Module({
  controllers: [LoyaltyCardsController],
  providers: [LoyaltyCardsService],
  exports: [LoyaltyCardsService],
})
export class LoyaltyCardsModule {}

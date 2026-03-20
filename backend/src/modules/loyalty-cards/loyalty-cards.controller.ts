import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { LoyaltyCardsService } from './loyalty-cards.service';
import { CreateLoyaltyCardDto } from './dto/create-loyalty-card.dto';

@Controller('api/loyalty-cards')
export class LoyaltyCardsController {
  constructor(private loyaltyCardsService: LoyaltyCardsService) {}

  @Post()
  createCard(@Body() createCardDto: CreateLoyaltyCardDto) {
    return this.loyaltyCardsService.createCard(createCardDto);
  }

  @Get('customer/:customerId')
  getUserCards(@Param('customerId') customerId: string) {
    return this.loyaltyCardsService.getUserCards(customerId);
  }

  @Get('merchant/:merchantId')
  getBusinessCards(@Param('merchantId') merchantId: string) {
    return this.loyaltyCardsService.getBusinessCards(merchantId);
  }

  @Get(':cardId')
  getCardDetail(@Param('cardId') cardId: string) {
    return this.loyaltyCardsService.getCardDetail(cardId);
  }
}

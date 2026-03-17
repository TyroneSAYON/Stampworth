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

  @Get('user/:userId')
  getUserCards(@Param('userId') userId: string) {
    return this.loyaltyCardsService.getUserCards(userId);
  }

  @Get('business/:businessId')
  getBusinessCards(@Param('businessId') businessId: string) {
    return this.loyaltyCardsService.getBusinessCards(businessId);
  }

  @Get(':cardId')
  getCardDetail(@Param('cardId') cardId: string) {
    return this.loyaltyCardsService.getCardDetail(cardId);
  }
}

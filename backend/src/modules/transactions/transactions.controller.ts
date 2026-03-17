import { Controller, Get, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('api/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get('business/:businessId')
  getBusinessTransactions(@Param('businessId') businessId: string) {
    return this.transactionsService.getBusinessTransactions(businessId);
  }

  @Get('user/:userId')
  getUserTransactions(@Param('userId') userId: string) {
    return this.transactionsService.getUserTransactions(userId);
  }

  @Get('card/:cardId')
  getCardTransactions(@Param('cardId') cardId: string) {
    return this.transactionsService.getCardTransactions(cardId);
  }
}

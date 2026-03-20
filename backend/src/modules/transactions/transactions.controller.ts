import { Controller, Get, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('api/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get('merchant/:merchantId')
  getBusinessTransactions(@Param('merchantId') merchantId: string) {
    return this.transactionsService.getBusinessTransactions(merchantId);
  }

  @Get('customer/:customerId')
  getUserTransactions(@Param('customerId') customerId: string) {
    return this.transactionsService.getUserTransactions(customerId);
  }

  @Get('card/:cardId')
  getCardTransactions(@Param('cardId') cardId: string) {
    return this.transactionsService.getCardTransactions(cardId);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { LoyaltyCardsModule } from './modules/loyalty-cards/loyalty-cards.module';
import { StampsModule } from './modules/stamps/stamps.module';
import { QRCodesModule } from './modules/qr-codes/qr-codes.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { LocationsModule } from './modules/locations/locations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    BusinessesModule,
    LoyaltyCardsModule,
    StampsModule,
    QRCodesModule,
    TransactionsModule,
    RewardsModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

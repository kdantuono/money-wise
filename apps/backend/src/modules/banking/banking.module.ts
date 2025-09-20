import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { PlaidService } from './plaid.service';
import { PlaidController } from './plaid.controller';
import { PlaidAccount } from './entities/plaid-account.entity';
import { PlaidTransaction } from './entities/plaid-transaction.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlaidAccount, PlaidTransaction, User])],
  controllers: [PlaidController],
  providers: [
    PlaidService,
    {
      provide: 'PLAID_API',
      useFactory: (configService: ConfigService) => {
        const configuration = new Configuration({
          basePath:
            PlaidEnvironments[configService.get('PLAID_ENV', 'sandbox')],
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': configService.get('PLAID_CLIENT_ID'),
              'PLAID-SECRET': configService.get('PLAID_SECRET'),
            },
          },
        });
        return new PlaidApi(configuration);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PlaidService],
})
export class BankingModule {}

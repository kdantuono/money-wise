import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { PlaidAccount } from './entities/plaid-account.entity';
import { PlaidTransaction } from './entities/plaid-transaction.entity';
import { User } from '../auth/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlaidService {
  private plaidClient: PlaidApi;

  constructor(
    @InjectRepository(PlaidAccount)
    private plaidAccountRepository: Repository<PlaidAccount>,
    @InjectRepository(PlaidTransaction)
    private plaidTransactionRepository: Repository<PlaidTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    @Inject('PLAID_API') private plaidApi: PlaidApi,
  ) {
    this.plaidClient = this.plaidApi;
  }

  async initializePlaidLink(userId: string, options?: {
    clientName?: string;
    language?: string;
    countryCodes?: string[];
    products?: string[];
  }): Promise<{
    linkToken: string;
    expiration: string;
    requestId: string;
  }> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const request = {
        user: {
          client_user_id: userId,
        },
        client_name: options?.clientName || 'MoneyWise',
        products: (options?.products || this.configService.get('PLAID_PRODUCTS', 'transactions,auth').split(',')) as Products[],
        country_codes: (options?.countryCodes || this.configService.get('PLAID_COUNTRY_CODES', 'US').split(',')) as CountryCode[],
        language: options?.language || 'en',
      };

      const response = await this.plaidClient.linkTokenCreate(request);

      return {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw error;
    }
  }

  async exchangePublicToken(userId: string, publicToken: string, metadata?: any): Promise<{
    accounts: any[];
    item: any;
    requestId: string;
  }> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Exchange public token for access token
      const tokenResponse = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = tokenResponse.data.access_token;
      const itemId = tokenResponse.data.item_id;

      // Get account information
      const accountsResponse = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });

      const accounts = accountsResponse.data.accounts;
      const institutionId = accountsResponse.data.item.institution_id;

      // Get institution information
      const institutionResponse = await this.plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });

      const institutionName = institutionResponse.data.institution.name;

      // Save accounts to database
      const savedAccounts = [];
      for (const account of accounts) {
        const plaidAccount = this.plaidAccountRepository.create({
          userId,
          plaidAccountId: account.account_id,
          plaidItemId: itemId,
          accessToken,
          institutionId,
          institutionName,
          accountName: account.name,
          accountType: account.type,
          accountSubtype: account.subtype,
          currentBalance: account.balances.current,
          availableBalance: account.balances.available,
          currencyCode: account.balances.iso_currency_code || 'USD',
          isActive: true,
          lastSyncAt: new Date(),
        });

        const savedAccount = await this.plaidAccountRepository.save(plaidAccount);
        savedAccounts.push(savedAccount);
      }

      return {
        accounts: savedAccounts,
        item: { id: itemId, institutionId, institutionName },
        requestId: tokenResponse.data.request_id,
      };
    } catch (error) {
      throw error;
    }
  }

  async syncTransactions(accountId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    count?: number;
  }): Promise<{
    accountId: string;
    transactionsAdded: number;
    transactionsModified: number;
    transactionsRemoved: number;
    lastSyncAt: Date;
    status: string;
  }> {
    // Get account with access token
    const plaidAccount = await this.plaidAccountRepository.findOne({
      where: { id: accountId },
    });

    if (!plaidAccount) {
      throw new NotFoundException('Plaid account not found');
    }

    try {
      const request = {
        access_token: plaidAccount.accessToken,
        cursor: plaidAccount.cursor || undefined,
      };

      const response = await this.plaidClient.transactionsSync(request);
      const { added, modified, removed, next_cursor } = response.data;

      let transactionsAdded = 0;
      let transactionsModified = 0;
      let transactionsRemoved = 0;

      // Process added transactions
      for (const txn of added) {
        const transaction = {
          plaidAccountId: accountId,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount,
          date: new Date(txn.date),
          authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          description: txn.name || txn.merchant_name || 'Transaction',
          merchantName: txn.merchant_name || null,
          accountOwner: txn.account_owner || null,
          category: txn.category || [],
          categoryId: txn.category_id || null,
          subcategory: null, // Not available in current Plaid API
          transactionType: null, // Not available in current Plaid API
          transactionCode: txn.transaction_code || null,
          isoCurrencyCode: txn.iso_currency_code || 'USD',
          unofficialCurrencyCode: txn.unofficial_currency_code || null,
          isPending: txn.pending || false,
          location: txn.location ? JSON.parse(JSON.stringify(txn.location)) : null,
          paymentMeta: txn.payment_meta ? JSON.parse(JSON.stringify(txn.payment_meta)) : null,
          personalFinanceCategory: txn.personal_finance_category ? JSON.parse(JSON.stringify(txn.personal_finance_category)) : null,
        };

        await this.plaidTransactionRepository.upsert(transaction, {
          conflictPaths: ['plaidTransactionId'],
        });
        transactionsAdded++;
      }

      // Process modified transactions
      for (const txn of modified) {
        const transaction = {
          plaidAccountId: accountId,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount,
          date: new Date(txn.date),
          authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
          description: txn.name || txn.merchant_name || 'Transaction',
          merchantName: txn.merchant_name || null,
          accountOwner: txn.account_owner || null,
          category: txn.category || [],
          categoryId: txn.category_id || null,
          subcategory: null, // Not available in current Plaid API
          transactionType: null, // Not available in current Plaid API
          transactionCode: txn.transaction_code || null,
          isoCurrencyCode: txn.iso_currency_code || 'USD',
          unofficialCurrencyCode: txn.unofficial_currency_code || null,
          isPending: txn.pending || false,
          location: txn.location ? JSON.parse(JSON.stringify(txn.location)) : null,
          paymentMeta: txn.payment_meta ? JSON.parse(JSON.stringify(txn.payment_meta)) : null,
          personalFinanceCategory: txn.personal_finance_category ? JSON.parse(JSON.stringify(txn.personal_finance_category)) : null,
        };

        await this.plaidTransactionRepository.upsert(transaction, {
          conflictPaths: ['plaidTransactionId'],
        });
        transactionsModified++;
      }

      // Process removed transactions
      for (const removedTxnId of removed) {
        await this.plaidTransactionRepository.delete({
          plaidTransactionId: removedTxnId.transaction_id,
        });
        transactionsRemoved++;
      }

      // Update account with new cursor and sync time
      const lastSyncAt = new Date();
      await this.plaidAccountRepository.update(accountId, {
        cursor: next_cursor,
        lastSyncAt,
      });

      return {
        accountId,
        transactionsAdded,
        transactionsModified,
        transactionsRemoved,
        lastSyncAt,
        status: 'success',
      };
    } catch (error) {
      throw error;
    }
  }

  async getAccountsByUser(userId: string): Promise<any[]> {
    const accounts = await this.plaidAccountRepository.find({
      where: { userId, isActive: true },
      relations: ['transactions'],
      order: { createdAt: 'DESC' },
    });

    return accounts.map(account => ({
      id: account.id,
      plaidAccountId: account.plaidAccountId,
      institutionName: account.institutionName,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      currencyCode: account.currencyCode,
      lastSyncAt: account.lastSyncAt,
      createdAt: account.createdAt,
      transactionCount: account.transactions?.length || 0,
    }));
  }

  async handleWebhook(webhookData: any): Promise<{ status: string; message: string }> {
    const { webhookType, webhookCode, itemId, newTransactions, removedTransactions } = webhookData;
    const webhook_type = webhookType;
    const webhook_code = webhookCode;
    const item_id = itemId;

    try {
      switch (webhook_type) {
        case 'TRANSACTIONS':
          if (webhook_code === 'DEFAULT_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
            // Find account by item_id
            const account = await this.plaidAccountRepository.findOne({
              where: { plaidItemId: item_id },
            });

            if (account) {
              await this.syncTransactions(account.id);
              return { status: 'processed', message: 'Webhook processed successfully' };
            } else {
              return { status: 'ignored', message: 'Account not found for item_id' };
            }
          }
          break;

        case 'ITEM':
          if (webhook_code === 'ERROR') {
            // Handle item errors (e.g., expired tokens)
            await this.plaidAccountRepository.update(
              { plaidItemId: item_id },
              { isActive: false }
            );
            return { status: 'processed', message: 'Item error processed' };
          }
          break;

        default:
          return { status: 'ignored', message: 'Webhook type not supported' };
      }

      return { status: 'ignored', message: 'Webhook code not handled' };
    } catch (error) {
      throw error;
    }
  }

  async handlePlaidError(error: any): Promise<{
    code: string;
    message: string;
    action: string;
    userFriendly: boolean;
    retryAfter?: number;
    backoffSeconds?: number;
  }> {
    const errorCode = error.error_code;
    const displayMessage = error.display_message || error.error_message;

    // Map Plaid errors to user-friendly responses
    const errorMapping = {
      'ITEM_LOGIN_REQUIRED': {
        action: 'RELINK_REQUIRED',
        userFriendly: true,
      },
      'INSTITUTION_DOWN': {
        action: 'RETRY_LATER',
        retryAfter: 30 * 60 * 1000, // 30 minutes
        userFriendly: true,
      },
      'INSTITUTION_NOT_RESPONDING': {
        action: 'RETRY_LATER',
        retryAfter: 15 * 60 * 1000, // 15 minutes
        userFriendly: true,
      },
      'RATE_LIMIT_EXCEEDED': {
        action: 'BACKOFF_REQUIRED',
        backoffSeconds: 60, // 1 minute
        userFriendly: true,
      },
      'API_ERROR': {
        action: 'RETRY_LATER',
        retryAfter: 5 * 60 * 1000, // 5 minutes
        userFriendly: false,
      },
    };

    const errorConfig = errorMapping[errorCode] || {
      action: 'CONTACT_SUPPORT',
      userFriendly: false,
    };

    return {
      code: errorCode,
      message: displayMessage,
      ...errorConfig,
    };
  }

  // Legacy method - will be deprecated
  async connectBank(userId: string, bankData: any): Promise<any> {
    // Redirect to new Plaid implementation
    return this.initializePlaidLink(userId);
  }

  // Legacy method - will be deprecated
  async getBankConnections(userId: string): Promise<any[]> {
    return this.getAccountsByUser(userId);
  }

  // Legacy method - will be deprecated
  async disconnectBank(userId: string, connectionId: string): Promise<void> {
    await this.plaidAccountRepository.update(connectionId, { isActive: false });
  }
}
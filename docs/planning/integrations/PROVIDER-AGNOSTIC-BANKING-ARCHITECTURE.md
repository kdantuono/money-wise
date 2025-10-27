# Provider-Agnostic Banking Integration Architecture

**Status**: Ready for Implementation
**Primary Provider**: SaltEdge (MVP)
**Fallback Providers**: Tink, Yapily (if cost optimization needed)
**Design Pattern**: Strategy Pattern + Factory Pattern

---

## Architecture Overview

This design enables MoneyWise to:
1. Start with **SaltEdge** (free tier MVP)
2. Switch to **Tink** if budget requires (€0.50/user transparent pricing)
3. Migrate to **Yapily/TrueLayer** for enterprise scale
4. Add multiple providers simultaneously for redundancy

**Core Principle**: Change provider implementation without changing application code.

---

## Architectural Layers

```
┌─────────────────────────────────────────┐
│  API Controllers (REST Endpoints)       │
│  GET /banking/accounts                  │
│  POST /banking/link                     │
│  POST /banking/sync                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  BankingService (Provider-Agnostic)     │
│  - Route to correct provider            │
│  - Handle provider switching            │
│  - Cost tracking                        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Provider Interface (IBankingProvider)  │
│  - initiateLink()                       │
│  - getAccounts()                        │
│  - getTransactions()                    │
│  - getBalance()                         │
└──────┬──────────────┬──────────────────┘
       │              │
   ┌───▼─┐      ┌────▼────┐
   │ SQL │      │  Tink   │
   │Edge │      │ (Future)│
   └─────┘      └─────────┘
```

---

## Layer 1: Provider Interface

### Define the Contract

**File**: `apps/backend/src/banking/interfaces/banking-provider.interface.ts`

```typescript
/**
 * Banking provider abstraction interface.
 *
 * All banking providers must implement this interface to be
 * swappable with minimal code changes.
 *
 * This design allows:
 * - Easy switching between SaltEdge → Tink → Yapily
 * - Running multiple providers in parallel for redundancy
 * - Future provider additions without architecture changes
 */

export interface BankingProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

// Response types - normalized across all providers
export interface LinkFlowResponse {
  requisitionId: string;      // Provider-specific ID
  redirectUrl: string;         // OAuth flow URL
  expiresAt: Date;            // When link expires
  provider: string;            // Which provider
}

export interface AccountData {
  id: string;                  // Provider account ID
  iban: string;
  accountNumber?: string;
  name: string;                // Account holder name
  displayName?: string;        // "Conto Corrente Intesa"
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  currency: string;            // EUR
  balance: Decimal;
  availableBalance?: Decimal;
  lastUpdatedAt?: Date;
}

export interface TransactionData {
  id: string;                  // Provider transaction ID
  accountId: string;
  date: Date;
  bookingDate?: Date;
  amount: Decimal;             // Can be negative for debits
  currency: string;
  description: string;
  merchant?: string;
  counterpartyName?: string;
  referenceNumber?: string;
  category?: string;           // If provider supports categorization
  metadata: Record<string, any>; // Provider-specific fields
}

export interface BalanceInfo {
  balance: Decimal;
  availableBalance?: Decimal;
  currency: string;
  lastUpdatedAt: Date;
}

export interface RequisitionStatus {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'COMPLETED';
  expiresAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface LinkedAccountInfo {
  accounts: AccountData[];
  connectionStatus: string;
  lastSyncAt?: Date;
}

export interface SyncResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  accountsSynced?: number;
  transactionsSynced?: number;
  error?: string;
  errorCode?: string;
}

// **MAIN INTERFACE** - All providers must implement this
export interface IBankingProvider {

  // ============ Authentication ============
  /**
   * Initialize provider with credentials.
   * Called once during application startup.
   */
  authenticate(config: BankingProviderConfig): Promise<void>;

  // ============ Link Flow (OAuth) ============
  /**
   * Initiate OAuth link flow with bank.
   * Returns redirect URL for user to authorize.
   */
  initiateLink(
    userId: string,
    institutionId?: string
  ): Promise<LinkFlowResponse>;

  /**
   * Check status of OAuth flow (is user still authorizing?).
   */
  getRequisitionStatus(requisitionId: string): Promise<RequisitionStatus>;

  /**
   * Complete OAuth flow - fetch linked accounts.
   */
  completeLink(requisitionId: string): Promise<LinkedAccountInfo>;

  /**
   * Revoke/disconnect OAuth link.
   */
  invalidateLink(requisitionId: string): Promise<void>;

  // ============ Institution Data ============
  /**
   * List available banks for a country.
   */
  getInstitutions(country: string): Promise<Institution[]>;

  /**
   * Get details for specific bank.
   */
  getInstitution(id: string): Promise<Institution>;

  // ============ Account Data ============
  /**
   * List accounts from OAuth connection.
   */
  getAccounts(requisitionId: string): Promise<AccountData[]>;

  /**
   * Get single account details.
   */
  getAccount(accountId: string): Promise<AccountData>;

  /**
   * Get current balance for account.
   */
  getBalance(accountId: string): Promise<BalanceInfo>;

  // ============ Transaction Data ============
  /**
   * Get transaction history for account.
   * Most banks provide 90 days; some support custom ranges.
   */
  getTransactions(
    accountId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<TransactionData[]>;

  // ============ Sync Status ============
  /**
   * Get last successful sync timestamp.
   */
  getLastSync(accountId: string): Promise<Date | null>;

  /**
   * Check if provider is operational (health check).
   */
  healthCheck(): Promise<boolean>;
}

export interface Institution {
  id: string;
  name: string;
  bic?: string;
  country: string;
  supportedServices: {
    ais: boolean;      // Account Information Service
    pis: boolean;      // Payment Initiation Service
  };
  logo?: string;
}
```

---

## Layer 2: Provider Implementation (SaltEdge)

### SaltEdge Provider Class

**File**: `apps/backend/src/banking/providers/saltedge.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IBankingProvider, /* ... */ } from '../interfaces/banking-provider.interface';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * SaltEdge Implementation
 *
 * Official Docs: https://docs.saltedge.com/account_information/v5/
 *
 * SaltEdge Account Information Service (AIS) for:
 * - Account aggregation
 * - 90-day transaction history
 * - Real-time balance updates
 * - 100+ Italian banks
 * - Free tier: 100 live connections/month
 */

@Injectable()
export class SaltEdgeProvider implements IBankingProvider {
  private httpClient: AxiosInstance;
  private clientId: string;
  private secret: string;

  async authenticate(config: BankingProviderConfig): Promise<void> {
    this.clientId = config.apiKey;
    this.secret = config.secretKey;

    this.httpClient = axios.create({
      baseURL: config.baseUrl || 'https://api.saltedge.com/api/v5',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Test connectivity
    await this.healthCheck();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this._request('get', '/customers');
      return response.status === 200;
    } catch (error) {
      console.error('SaltEdge health check failed', error);
      return false;
    }
  }

  async initiateLink(userId: string): Promise<LinkFlowResponse> {
    /**
     * Create "connection" (OAuth session) in SaltEdge.
     *
     * Flow:
     * 1. Create connection with redirect URL
     * 2. User redirected to SaltEdge consent page
     * 3. User selects Italian bank
     * 4. Bank OAuth flow (user authorizes)
     * 5. Redirect back to app with connection_id
     */

    const body = {
      data: {
        customer_id: userId,  // Your internal user ID
        redirect_url: `${process.env.FRONTEND_URL}/banking/callback`,
        return_connection_id: true,
        country_code: 'IT',   // For MVP: Italy only
        mode: 'web',
        // Allow user to select bank AND account
        categorize_personal_transactions: false,
      },
    };

    const response = await this._request('post', '/connections', body);

    return {
      requisitionId: response.data.data.id,
      redirectUrl: response.data.data.connect_url,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      provider: 'SALTEDGE',
    };
  }

  async getRequisitionStatus(connectionId: string): Promise<RequisitionStatus> {
    const response = await this._request('get', `/connections/${connectionId}`);
    const connection = response.data.data;

    return {
      id: connection.id,
      status: this._normalizeStatus(connection.status),
      expiresAt: connection.expires_at ? new Date(connection.expires_at) : undefined,
      createdAt: new Date(connection.created_at),
      completedAt: connection.last_attempt?.updated_at ? new Date(connection.last_attempt.updated_at) : undefined,
    };
  }

  async completeLink(connectionId: string): Promise<LinkedAccountInfo> {
    /**
     * After user completes OAuth flow, fetch accounts.
     *
     * SaltEdge returns:
     * - Multiple accounts under single connection
     * - Account balances
     * - Account metadata (IBAN, etc.)
     * - Last sync timestamp
     */

    const accountsResponse = await this._request('get', `/accounts?connection_id=${connectionId}`);

    const accounts: AccountData[] = accountsResponse.data.data.map((account: any) => ({
      id: account.id,
      name: account.name || 'Unknown',
      iban: account.number,
      type: this._normalizeAccountType(account.nature),
      currency: account.currency_code,
      balance: new Decimal(account.balance || 0),
      availableBalance: account.extra?.available_amount ? new Decimal(account.extra.available_amount) : undefined,
      lastUpdatedAt: new Date(account.updated_at),
    }));

    return {
      accounts,
      connectionStatus: 'ACTIVE',
      lastSyncAt: new Date(),
    };
  }

  async getAccounts(connectionId: string): Promise<AccountData[]> {
    const response = await this._request('get', `/accounts?connection_id=${connectionId}`);

    return response.data.data.map((account: any) => ({
      id: account.id,
      name: account.name,
      iban: account.number,
      type: this._normalizeAccountType(account.nature),
      currency: account.currency_code,
      balance: new Decimal(account.balance),
      lastUpdatedAt: new Date(account.updated_at),
    }));
  }

  async getAccount(accountId: string): Promise<AccountData> {
    const response = await this._request('get', `/accounts/${accountId}`);
    const account = response.data.data;

    return {
      id: account.id,
      name: account.name,
      iban: account.number,
      type: this._normalizeAccountType(account.nature),
      currency: account.currency_code,
      balance: new Decimal(account.balance),
      lastUpdatedAt: new Date(account.updated_at),
    };
  }

  async getBalance(accountId: string): Promise<BalanceInfo> {
    const response = await this._request('get', `/accounts/${accountId}`);
    const account = response.data.data;

    return {
      balance: new Decimal(account.balance),
      availableBalance: account.extra?.available_amount ? new Decimal(account.extra.available_amount) : undefined,
      currency: account.currency_code,
      lastUpdatedAt: new Date(account.updated_at),
    };
  }

  async getTransactions(
    accountId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<TransactionData[]> {
    /**
     * Fetch transactions from SaltEdge.
     *
     * SaltEdge provides:
     * - 90 day default history
     * - 1000+ transactions per request
     * - Pagination support
     *
     * Limits:
     * - Cannot go beyond 90 days (bank API limit)
     * - ~4 syncs per day per account (fair use)
     */

    const params = new URLSearchParams({
      account_id: accountId,
      from_date: fromDate.toISOString().split('T')[0],
      to_date: toDate.toISOString().split('T')[0],
    });

    const response = await this._request('get', `/transactions?${params}`);

    return response.data.data.map((tx: any) => ({
      id: tx.id,
      accountId: tx.account_id,
      date: new Date(tx.made_on),
      bookingDate: tx.posted_on ? new Date(tx.posted_on) : undefined,
      amount: new Decimal(tx.amount),
      currency: tx.currency_code,
      description: tx.description,
      merchant: tx.merchant_name,
      counterpartyName: tx.counterparty_name,
      referenceNumber: tx.extra?.original_transaction_id,
      metadata: tx.extra || {},
    }));
  }

  async getLastSync(accountId: string): Promise<Date | null> {
    const response = await this._request('get', `/accounts/${accountId}`);
    const account = response.data.data;

    return account.last_sync_at ? new Date(account.last_sync_at) : null;
  }

  async invalidateLink(connectionId: string): Promise<void> {
    await this._request('delete', `/connections/${connectionId}`);
  }

  async getInstitutions(country: string): Promise<Institution[]> {
    const response = await this._request('get', `/institutions?country_code=${country.toUpperCase()}`);

    return response.data.data.map((inst: any) => ({
      id: inst.code,
      name: inst.name,
      bic: inst.bic_code,
      country: inst.country_code,
      supportedServices: {
        ais: true,  // All SaltEdge institutions support AIS
        pis: inst.supports_payment_initiation || false,
      },
      logo: inst.logo_url,
    }));
  }

  async getInstitution(id: string): Promise<Institution> {
    const response = await this._request('get', `/institutions/${id}`);
    const inst = response.data.data;

    return {
      id: inst.code,
      name: inst.name,
      bic: inst.bic_code,
      country: inst.country_code,
      supportedServices: {
        ais: true,
        pis: inst.supports_payment_initiation || false,
      },
      logo: inst.logo_url,
    };
  }

  // ============ Private Helpers ============

  private async _request(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    body?: any
  ): Promise<any> {
    try {
      const signature = this._generateSignature(url, body);

      const config = {
        headers: {
          'X-App-ID': this.clientId,
          'X-App-Secret': signature,
        },
      };

      const response = await this.httpClient[method](url, body, config);
      return response.data;
    } catch (error: any) {
      console.error(`SaltEdge API error: ${method.toUpperCase()} ${url}`, error.response?.data);
      throw error;
    }
  }

  private _generateSignature(url: string, body?: any): string {
    /**
     * SaltEdge requires HMAC-SHA256 signature for authentication.
     *
     * See: https://docs.saltedge.com/account_information/v5/general/overview.html#generating-signatures
     */
    const payload = body ? JSON.stringify(body) : '';
    const message = `${url}${payload}`;

    return crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');
  }

  private _normalizeStatus(status: string): RequisitionStatus['status'] {
    const mapping: Record<string, RequisitionStatus['status']> = {
      'CONNECTED': 'ACTIVE',
      'AUTHENTICATION_ERROR': 'SUSPENDED',
      'INVALID_CREDENTIALS': 'SUSPENDED',
      'FETCHING': 'PENDING',
    };
    return (mapping[status] || 'PENDING') as RequisitionStatus['status'];
  }

  private _normalizeAccountType(nature: string): AccountData['type'] {
    const mapping: Record<string, AccountData['type']> = {
      'CARD': 'credit',
      'CHECKING': 'checking',
      'SAVINGS': 'savings',
      'INVESTMENT': 'investment',
      'LOAN': 'loan',
    };
    return (mapping[nature] || 'checking') as AccountData['type'];
  }
}
```

### Future: Tink Provider (Placeholder)

**File**: `apps/backend/src/banking/providers/tink.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IBankingProvider, /* ... */ } from '../interfaces/banking-provider.interface';

/**
 * Tink Implementation (Phase 2)
 *
 * When SaltEdge reaches free tier limit (100 connections):
 * 1. Switch providers to Tink (€0.50/user/month)
 * 2. No application code changes (interface abstraction)
 * 3. Migration: ~1-2 weeks with provider-agnostic architecture
 *
 * Official Docs: https://docs.tink.com/api
 */

@Injectable()
export class TinkProvider implements IBankingProvider {
  // Implementation follows same interface
  async authenticate(config: BankingProviderConfig): Promise<void> {
    // TODO: Tink authentication
  }

  async initiateLink(userId: string): Promise<LinkFlowResponse> {
    // TODO: Tink OAuth flow
  }

  // ... rest of interface implementation
}
```

---

## Layer 3: Banking Service (Provider-Agnostic)

**File**: `apps/backend/src/banking/services/banking.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IBankingProvider, LinkFlowResponse } from '../interfaces/banking-provider.interface';
import { SaltEdgeProvider } from '../providers/saltedge.provider';
import { TinkProvider } from '../providers/tink.provider';

/**
 * Provider-Agnostic Banking Service
 *
 * This service:
 * 1. Routes requests to correct provider
 * 2. Handles provider switching logic
 * 3. Tracks costs and provider health
 * 4. Manages multi-provider redundancy
 *
 * Key benefit: Change provider without modifying controllers or business logic.
 */

@Injectable()
export class BankingService {
  private providers: Map<string, IBankingProvider>;
  private defaultProvider: string = 'SALTEDGE';

  constructor(
    private saltEdgeProvider: SaltEdgeProvider,
    private tinkProvider: TinkProvider,
    private prisma: PrismaService,
  ) {
    // Register all available providers
    this.providers = new Map([
      ['SALTEDGE', saltEdgeProvider],
      ['TINK', tinkProvider],
      // ['YAPILY', yarilyProvider],  // Phase 3
    ]);
  }

  /**
   * Route to provider based on:
   * 1. User preference (if set)
   * 2. Cost optimization (free tier first)
   * 3. Provider health
   * 4. Feature availability
   */
  private getProvider(provider?: string): IBankingProvider {
    const providerName = provider || this.defaultProvider;
    const bankingProvider = this.providers.get(providerName);

    if (!bankingProvider) {
      throw new Error(`Unknown banking provider: ${providerName}`);
    }

    return bankingProvider;
  }

  async initiateLink(userId: string, provider?: string): Promise<LinkFlowResponse> {
    const bankingProvider = this.getProvider(provider);
    const linkFlow = await bankingProvider.initiateLink(userId);

    // Store link in database
    await this.prisma.bankingConnection.create({
      data: {
        userId,
        provider: linkFlow.provider,
        connectionId: linkFlow.requisitionId,
        redirectUrl: linkFlow.redirectUrl,
        expiresAt: linkFlow.expiresAt,
      },
    });

    return linkFlow;
  }

  async completeLink(requisitionId: string): Promise<Account[]> {
    const connection = await this.prisma.bankingConnection.findUnique({
      where: { connectionId: requisitionId },
    });

    const bankingProvider = this.getProvider(connection.provider);
    const accountInfo = await bankingProvider.completeLink(requisitionId);

    // Create Account records
    const accounts = await Promise.all(
      accountInfo.accounts.map((acc) =>
        this.prisma.account.create({
          data: {
            userId: connection.userId,
            name: acc.displayName || acc.name,
            type: acc.type,
            currentBalance: acc.balance,
            bankingProvider: connection.provider,
            bankName: 'TBD', // Fetch from institution data
            accountHolderName: acc.name,
            saltEdgeConnectionId: requisitionId,
          },
        })
      )
    );

    // Mark connection as authorized
    await this.prisma.bankingConnection.update({
      where: { id: connection.id },
      data: {
        status: 'authorized',
        authorizedAt: new Date(),
      },
    });

    return accounts;
  }

  async syncAccount(accountId: string): Promise<SyncResult> {
    /**
     * Sync single account:
     * 1. Check provider
     * 2. Fetch latest transactions (last 90 days)
     * 3. Update balance
     * 4. Store in database
     */

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account.bankingProvider) {
      throw new Error('Account not linked to banking provider');
    }

    const bankingProvider = this.getProvider(account.bankingProvider);

    try {
      // Update balance
      const balance = await bankingProvider.getBalance(account.saltEdgeConnectionId);
      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          currentBalance: balance.balance,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      // Fetch transactions (last 90 days)
      const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const toDate = new Date();

      const transactions = await bankingProvider.getTransactions(
        account.saltEdgeConnectionId,
        fromDate,
        toDate
      );

      // Store transactions...
      // (implementation detail)

      return {
        status: 'SUCCESS',
        transactionsSynced: transactions.length,
      };
    } catch (error) {
      await this.prisma.account.update({
        where: { id: accountId },
        data: {
          syncStatus: 'ERROR',
          syncError: error.message,
        },
      });

      return {
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  /**
   * Check if provider needs upgrade (cost optimization).
   *
   * For SaltEdge:
   * - Monitor active connections
   * - Alert at 80 connections (80% of 100 free limit)
   * - Trigger manual review at 95 connections
   */
  async checkProviderCosts(): Promise<{
    provider: string;
    usage: number;
    limit: number;
    percentUsed: number;
    requiresAction: boolean;
  }> {
    // Count active SaltEdge connections
    const saltEdgeConnections = await this.prisma.bankingConnection.count({
      where: {
        provider: 'SALTEDGE',
        status: 'authorized',
      },
    });

    return {
      provider: 'SALTEDGE',
      usage: saltEdgeConnections,
      limit: 100,
      percentUsed: (saltEdgeConnections / 100) * 100,
      requiresAction: saltEdgeConnections >= 80,
    };
  }
}
```

---

## Layer 4: API Controllers

**File**: `apps/backend/src/banking/banking.controller.ts`

```typescript
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { BankingService } from './services/banking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Banking')
@Controller('api/banking')
export class BankingController {
  constructor(private bankingService: BankingService) {}

  @Post('initiate-link')
  @UseGuards(JwtAuthGuard)
  async initiateLink(@CurrentUser() user: User) {
    const linkFlow = await this.bankingService.initiateLink(user.id);
    return { redirectUrl: linkFlow.redirectUrl };
  }

  @Post('complete-link')
  @UseGuards(JwtAuthGuard)
  async completeLink(@CurrentUser() user: User, @Body() dto: { connectionId: string }) {
    const accounts = await this.bankingService.completeLink(dto.connectionId);
    return accounts;
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@CurrentUser() user: User) {
    return await this.prisma.account.findMany({
      where: { userId: user.id },
    });
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncAccount(@CurrentUser() user: User, @Body() dto: { accountId: string }) {
    const result = await this.bankingService.syncAccount(dto.accountId);
    return result;
  }

  @Get('cost-status')
  @UseGuards(JwtAuthGuard)
  async getCostStatus() {
    return await this.bankingService.checkProviderCosts();
  }
}
```

---

## Switching Providers (Migration Path)

### Scenario: SaltEdge Free Tier Exceeded

**Timeline**: When approaching 100 connections

**Steps**:

1. **Request Tink Quote**
   ```
   Budget: 100+ users × €0.50/user = €50-500/month
   Timeline: 2 weeks quote turnaround
   ```

2. **Create Tink Provider Implementation**
   ```typescript
   // Implement TinkProvider following same IBankingProvider interface
   ```

3. **Update BankingService**
   ```typescript
   // Change defaultProvider
   private defaultProvider: string = 'TINK';

   // Existing SaltEdge accounts continue to work
   // New links use Tink
   ```

4. **Test Migration**
   ```
   - Test Tink OAuth flow
   - Verify transaction fetching
   - Compare account data
   - Monitor sync success rate
   ```

5. **Deploy**
   ```
   - Gradual rollout (10% new users → Tink)
   - Monitor for 1 week
   - 100% rollout
   ```

6. **Results**
   ```
   - Zero application code changes
   - Old SaltEdge accounts auto-managed
   - New accounts on Tink
   - Easy rollback if needed
   ```

---

## Cost Optimization Decision Tree

```
Start MVP
    ├─ Use SaltEdge (100 free connections)
    │  └─ Monitor connections count
    │
    ├─ Connections < 80?
    │  └─ Continue SaltEdge ✅
    │
    ├─ Connections 80-95?
    │  ├─ Request Tink quote
    │  └─ Review budget
    │
    ├─ Connections 95-100?
    │  ├─ URGENT: Tink quote
    │  └─ Prepare migration
    │
    └─ Connections > 100?
       ├─ Option A: SaltEdge paid plan
       ├─ Option B: Migrate to Tink (€0.50/user)
       └─ Option C: Multi-provider strategy (redundancy)
```

---

## Multi-Provider Redundancy (Enterprise Phase)

For production scale, run multiple providers:

```typescript
// Banking Service - Future enhancement
async initiateLink(userId: string): Promise<LinkFlowResponse> {
  // Route to healthiest, most cost-effective provider

  const providers = [
    { name: 'SALTEDGE', available: saltedgeConnections < 100 },
    { name: 'TINK', available: tinkCost <= monthlyBudget },
    { name: 'YAPILY', available: yaplyCost <= monthlyBudget },
  ];

  const selected = providers
    .filter(p => p.available)
    .sort((a, b) => costScore(a) - costScore(b))[0];

  return this.bankingService.initiateLink(userId, selected.name);
}
```

---

## Implementation Checklist

- [ ] Create IBankingProvider interface
- [ ] Implement SaltEdgeProvider class
- [ ] Create BankingService
- [ ] Build API controllers
- [ ] Add database schema
- [ ] Implement background sync
- [ ] Add cost monitoring dashboard
- [ ] Create migration pathway (Tink)
- [ ] Write integration tests
- [ ] Security audit

---

## Key Benefits

✅ **Provider Agnostic**: Change providers without touching application logic
✅ **Cost Optimization**: SaltEdge free → Tink (€0.50/user) → Enterprise
✅ **Redundancy**: Run multiple providers simultaneously
✅ **Future Proof**: Easy to add Yapily, TrueLayer, etc.
✅ **Zero Downtime**: Migrate without service interruption
✅ **Testing**: Mock providers for unit tests

---

## References

- SaltEdge Docs: https://docs.saltedge.com/account_information/v5/
- Tink Docs: https://docs.tink.com/
- Strategy Pattern: https://refactoring.guru/design-patterns/strategy
- Factory Pattern: https://refactoring.guru/design-patterns/factory-method

---

**Document Status**: READY FOR IMPLEMENTATION
**Last Updated**: Oct 23, 2025

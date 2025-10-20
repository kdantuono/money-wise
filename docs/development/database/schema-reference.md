# Database Schema Reference

**Last Updated**: October 18, 2025
**Status**: Living Document
**Source**: `prisma/schema.prisma`

---

## Overview

This document provides reference to the current Prisma schema. For detailed information about specific models, see their sections below.

---

## Core Models

### User
User account and authentication information.

```prisma
model User {
  id                  String
  email               String
  passwordHash        String
  emailVerified       Boolean
  twoFactorEnabled    Boolean
  createdAt           DateTime
  updatedAt           DateTime

  // Relations
  accounts            Account[]
  sessions            Session[]
  budgets             Budget[]
  auditLogs           AuditLog[]
}
```

**Key Fields**:
- `id`: Unique identifier
- `email`: Email address (unique)
- `passwordHash`: bcrypt hashed password
- `emailVerified`: Email verification status
- `twoFactorEnabled`: 2FA activation flag

---

### Account
Financial accounts (checking, savings, credit cards, etc.).

```prisma
model Account {
  id              String
  userId          String
  name            String
  type            AccountType
  balance         Decimal
  currency        String
  status          AccountStatus
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  user            User
  transactions    Transaction[]
}
```

**Account Types**: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN

---

### Transaction
Individual financial transactions.

```prisma
model Transaction {
  id              String
  accountId       String
  categoryId      String
  amount          Decimal
  type            TransactionType
  description     String
  date            DateTime
  status          TransactionStatus
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  account         Account
  category        Category
}
```

**Transaction Types**: DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT

---

### Category
Transaction categories for organization.

```prisma
model Category {
  id              String
  userId          String
  name            String
  icon            String
  color           String
  status          CategoryStatus
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  transactions    Transaction[]
}
```

---

### Budget
Budget tracking and management.

```prisma
model Budget {
  id              String
  userId          String
  categoryId      String
  limit           Decimal
  period          BudgetPeriod
  status          BudgetStatus
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  user            User
}
```

**Budget Periods**: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY

---

## Supporting Models

### Session
User session management for authentication.

```prisma
model Session {
  id              String
  userId          String
  expiresAt       DateTime
  createdAt       DateTime

  // Relations
  user            User
}
```

---

### VerificationToken
Email verification tokens.

```prisma
model VerificationToken {
  identifier      String
  token           String (unique)
  expires         DateTime
}
```

---

### PasswordReset
Password reset tokens.

```prisma
model PasswordReset {
  id              String
  email           String
  token           String (unique)
  expiresAt       DateTime
  createdAt       DateTime
}
```

---

### AuditLog
System audit trail for compliance and debugging.

```prisma
model AuditLog {
  id              String
  userId          String
  action          String
  resource        String
  resourceId      String
  changes         Json
  createdAt       DateTime

  // Relations
  user            User
}
```

---

## Enums

### AccountType
- CHECKING
- SAVINGS
- CREDIT_CARD
- INVESTMENT
- LOAN
- OTHER

### TransactionType
- DEPOSIT
- WITHDRAWAL
- TRANSFER
- PAYMENT
- ADJUSTMENT
- FEE

### BudgetPeriod
- DAILY
- WEEKLY
- MONTHLY
- QUARTERLY
- YEARLY

### Status Enums
Each model has appropriate status enum:
- ACTIVE
- INACTIVE
- ARCHIVED
- DELETED (soft deletes via status)

---

## Relations Summary

```
User ──┬─→ Account
       ├─→ Session
       ├─→ Budget
       └─→ AuditLog

Account ──┬─→ Transaction
          └─→ User

Transaction ──┬─→ Account
              ├─→ Category
              └─→ User (via account)

Category ──┬─→ Transaction
           └─→ User
```

---

## Migration History

See [`migration-guide.md`](./migration-guide.md) for managing migrations and version history.

---

**For detailed schema code**: See `prisma/schema.prisma` in the repository

**Last schema update**: As reflected in the latest migration file in `prisma/migrations/`


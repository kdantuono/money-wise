# Milestone 2: Authentication & Core Models - Detailed Breakdown
## 34 Points → 118 Micro-Tasks

---

## Quick Reference for Claude Code

```yaml
Total Tasks: 118
Parallel Branches: 6
Estimated Time: Week 3
Critical Path: TASK-004 → TASK-007 → TASK-009
Dependencies: Milestone 1 must be complete
```

---

## [EPIC-002] Database Architecture (13 points → 48 tasks)

### [STORY-004] Database Schema Design (5 points → 20 tasks)

#### Phase 2.1: Core Schema Definition

##### [TASK-004-001] Create Database Connection Module
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/connection`
- **File**: `apps/backend/app/core/database.py`
- **Dependencies**: Milestone 1 complete
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

async def get_db_session() -> AsyncSession:
    # Create async session
    pass
```
**Acceptance Criteria**:
- [ ] Async engine setup
- [ ] Connection pooling configured
- [ ] Session factory
- [ ] Dependency injection ready

---

##### [TASK-004-002] Define Base Model Class
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/base-model`
- **File**: `apps/backend/app/models/base.py`
- **Dependencies**: [TASK-004-001]
```python
class BaseModel(Base):
    __abstract__ = True
    
    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```
**Acceptance Criteria**:
- [ ] UUID primary keys
- [ ] Timestamp fields
- [ ] Soft delete support
- [ ] JSON serialization method

---

##### [TASK-004-003] Create User Model
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/user-model`
- **File**: `apps/backend/app/models/user.py`
- **Dependencies**: [TASK-004-002]
```python
class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    tier = Column(String(20), default="free")
```
**Acceptance Criteria**:
- [ ] Email validation
- [ ] Password hash field
- [ ] Account status fields
- [ ] GDPR compliance fields

---

##### [TASK-004-004] Create Account Model
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/account-model`
- **File**: `apps/backend/app/models/account.py`
- **Dependencies**: [TASK-004-003]
```python
class Account(BaseModel):
    __tablename__ = "accounts"
    
    user_id = Column(UUID, ForeignKey("users.id"))
    name = Column(String(255))
    type = Column(String(50))  # checking, savings, credit
    
    # Plaid fields (nullable for MVP)
    plaid_account_id = Column(String(255), nullable=True)
    plaid_item_id = Column(String(255), nullable=True)
```
**Acceptance Criteria**:
- [ ] User relationship
- [ ] Account types enum
- [ ] Balance tracking
- [ ] Plaid-ready fields

---

##### [TASK-004-005] Create Transaction Model
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/transaction-model`
- **File**: `apps/backend/app/models/transaction.py`
- **Dependencies**: [TASK-004-004]
```python
class Transaction(BaseModel):
    __tablename__ = "transactions"
    
    account_id = Column(UUID, ForeignKey("accounts.id"))
    amount = Column(Numeric(12, 2))
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"))
```
**Acceptance Criteria**:
- [ ] Account relationship
- [ ] Amount validation
- [ ] Category relationship
- [ ] Date indexing

---

##### [TASK-004-006] Create Category Model
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/category-model`
- **File**: `apps/backend/app/models/category.py`
- **Dependencies**: [TASK-004-002]
```python
class Category(BaseModel):
    __tablename__ = "categories"
    
    name = Column(String(100))
    icon = Column(String(50))
    color = Column(String(7))
    is_system = Column(Boolean, default=False)
```
**Acceptance Criteria**:
- [ ] System vs custom categories
- [ ] Parent-child hierarchy
- [ ] Icon and color support
- [ ] Unique constraints

---

##### [TASK-004-007] Create Budget Model
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/budget-model`
- **File**: `apps/backend/app/models/budget.py`
- **Dependencies**: [TASK-004-003, TASK-004-006]
```python
class Budget(BaseModel):
    __tablename__ = "budgets"
    
    user_id = Column(UUID, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    amount = Column(Numeric(10, 2))
    period = Column(String(20))  # monthly, weekly
```
**Acceptance Criteria**:
- [ ] User relationship
- [ ] Category relationship
- [ ] Period validation
- [ ] Alert thresholds array

---

##### [TASK-004-008] Create Session Model
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/session-model`
- **File**: `apps/backend/app/models/session.py`
- **Dependencies**: [TASK-004-003]
```python
class Session(BaseModel):
    __tablename__ = "sessions"
    
    user_id = Column(UUID, ForeignKey("users.id"))
    token = Column(String(255), unique=True)
    expires_at = Column(DateTime)
```
**Acceptance Criteria**:
- [ ] Token uniqueness
- [ ] Expiry tracking
- [ ] Device information
- [ ] IP tracking

---

##### [TASK-004-009] Create Audit Log Model
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/audit-model`
- **File**: `apps/backend/app/models/audit.py`
- **Dependencies**: [TASK-004-002]
```python
class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    
    user_id = Column(UUID, ForeignKey("users.id"))
    action = Column(String(100))
    entity_type = Column(String(50))
    entity_id = Column(UUID)
```
**Acceptance Criteria**:
- [ ] Action tracking
- [ ] Entity polymorphism
- [ ] Metadata JSON field
- [ ] Timestamp indexing

---

##### [TASK-004-010] Define Model Relationships
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/relationships`
- **File**: `apps/backend/app/models/__init__.py`
- **Dependencies**: [TASK-004-003 through TASK-004-009]
```python
# User relationships
User.accounts = relationship("Account", back_populates="user")
User.budgets = relationship("Budget", back_populates="user")

# Account relationships  
Account.user = relationship("User", back_populates="accounts")
Account.transactions = relationship("Transaction", back_populates="account")
```
**Acceptance Criteria**:
- [ ] All relationships defined
- [ ] Lazy loading configured
- [ ] Cascade deletes set
- [ ] Circular imports resolved

---

##### [TASK-004-011] Create Database Indexes
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/indexes`
- **File**: `apps/backend/app/models/indexes.py`
- **Dependencies**: [TASK-004-010]
```python
# Performance indexes
Index('idx_transactions_user_date', Transaction.user_id, Transaction.date)
Index('idx_transactions_category', Transaction.category_id)
```
**Acceptance Criteria**:
- [ ] Query performance indexes
- [ ] Unique constraints
- [ ] Composite indexes
- [ ] Full-text search indexes

---

##### [TASK-004-012] Setup TimescaleDB Extension
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/timescale`
- **File**: `apps/backend/alembic/versions/001_enable_timescale.py`
- **Dependencies**: [TASK-004-005]
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('transactions', 'created_at');
```
**Acceptance Criteria**:
- [ ] Extension enabled
- [ ] Hypertables created
- [ ] Retention policies
- [ ] Continuous aggregates

---

##### [TASK-004-013] Create Enum Types
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `database/enums`
- **File**: `apps/backend/app/models/enums.py`
- **Dependencies**: [TASK-004-002]
```python
class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"

class UserTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
```
**Acceptance Criteria**:
- [ ] All enums defined
- [ ] Database enum types
- [ ] Validation integration
- [ ] Migration support

---

##### [TASK-004-014] Create Initial Migration
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `database/initial-migration`
- **File**: `apps/backend/alembic/versions/002_initial_schema.py`
- **Dependencies**: [TASK-004-010, TASK-004-011]
```python
def upgrade():
    # Create all tables
    # Add indexes
    # Add constraints
    pass
```
**Acceptance Criteria**:
- [ ] All tables created
- [ ] Foreign keys set
- [ ] Indexes created
- [ ] Rollback tested

---

##### [TASK-004-015] Create Seed Data Script
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/seed-data`
- **File**: `apps/backend/scripts/seed_data.py`
- **Dependencies**: [TASK-004-014]
```python
async def seed_categories():
    categories = [
        {"name": "Food & Dining", "icon": "🍽️", "color": "#FF6B6B"},
        {"name": "Transport", "icon": "🚗", "color": "#4ECDC4"},
        # ... more categories
    ]
```
**Acceptance Criteria**:
- [ ] Default categories
- [ ] Test users
- [ ] Sample transactions
- [ ] Idempotent execution

---

##### [TASK-004-016] Create Database Backup Script
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/backup`
- **File**: `scripts/backup_database.sh`
- **Dependencies**: [TASK-004-014]
```bash
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```
**Acceptance Criteria**:
- [ ] Automated backups
- [ ] Compression
- [ ] S3 upload
- [ ] Retention policy

---

##### [TASK-004-017] Create Migration Testing
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `database/migration-tests`
- **File**: `apps/backend/tests/test_migrations.py`
- **Dependencies**: [TASK-004-014]
```python
def test_migration_up_down():
    # Test migration up
    # Test migration down
    # Verify schema state
    pass
```
**Acceptance Criteria**:
- [ ] Forward migration test
- [ ] Rollback test
- [ ] Data integrity check
- [ ] Performance baseline

---

##### [TASK-004-018] Setup Database Monitoring
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `database/monitoring`
- **File**: `apps/backend/app/core/db_monitoring.py`
- **Dependencies**: [TASK-004-001]
```python
async def check_db_health():
    # Connection pool stats
    # Query performance
    # Table sizes
    pass
```
**Acceptance Criteria**:
- [ ] Connection metrics
- [ ] Query logging
- [ ] Slow query alerts
- [ ] Size monitoring

---

##### [TASK-004-019] Create Database Documentation
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `database/documentation`
- **File**: `docs/database_schema.md`
- **Dependencies**: [TASK-004-010]
```markdown
# Database Schema
## Tables
## Relationships
## Indexes
```
**Acceptance Criteria**:
- [ ] ERD diagram
- [ ] Table descriptions
- [ ] Index strategy
- [ ] Backup procedures

---

##### [TASK-004-020] Setup Database Permissions
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `database/permissions`
- **File**: `apps/backend/alembic/versions/003_permissions.py`
- **Dependencies**: [TASK-004-014]
```sql
GRANT SELECT, INSERT, UPDATE ON ALL TABLES TO app_user;
REVOKE DELETE ON audit_logs FROM app_user;
```
**Acceptance Criteria**:
- [ ] App user permissions
- [ ] Read-only user
- [ ] Admin permissions
- [ ] Row-level security

---

### [STORY-005] Repository Pattern Implementation (8 points → 28 tasks)

#### Phase 2.2: Data Access Layer

##### [TASK-005-001] Create Base Repository Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/base-interface`
- **File**: `apps/backend/app/repositories/base.py`
- **Dependencies**: [TASK-004-010]
```python
class IRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[T]:
        pass
    
    @abstractmethod
    async def find_all(self, **filters) -> List[T]:
        pass
```
**Acceptance Criteria**:
- [ ] Generic type support
- [ ] CRUD operations
- [ ] Filtering support
- [ ] Pagination support

---

##### [TASK-005-002] Implement Base Repository
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/base-impl`
- **File**: `apps/backend/app/repositories/base_impl.py`
- **Dependencies**: [TASK-005-001]
```python
class BaseRepository(IRepository[T]):
    def __init__(self, model: Type[T], db: AsyncSession):
        self.model = model
        self.db = db
        
    async def find_by_id(self, id: UUID) -> Optional[T]:
        return await self.db.get(self.model, id)
```
**Acceptance Criteria**:
- [ ] All interface methods
- [ ] Error handling
- [ ] Transaction support
- [ ] Query optimization

---

##### [TASK-005-003] Create User Repository Interface
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `repository/user-interface`
- **File**: `apps/backend/app/repositories/interfaces/user.py`
- **Dependencies**: [TASK-005-001]
```python
class IUserRepository(IRepository[User]):
    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[User]:
        pass
```
**Acceptance Criteria**:
- [ ] Email lookup
- [ ] Active users filter
- [ ] Tier filtering
- [ ] Custom queries

---

##### [TASK-005-004] Implement User Repository
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/user-impl`
- **File**: `apps/backend/app/repositories/user.py`
- **Dependencies**: [TASK-005-003]
```python
class UserRepository(BaseRepository[User], IUserRepository):
    async def find_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
```
**Acceptance Criteria**:
- [ ] Email validation
- [ ] Case-insensitive search
- [ ] Include relationships
- [ ] Query caching

---

##### [TASK-005-005] Create Account Repository Interface
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `repository/account-interface`
- **File**: `apps/backend/app/repositories/interfaces/account.py`
- **Dependencies**: [TASK-005-001]
```python
class IAccountRepository(IRepository[Account]):
    @abstractmethod
    async def find_by_user(self, user_id: UUID) -> List[Account]:
        pass
```
**Acceptance Criteria**:
- [ ] User filtering
- [ ] Type filtering
- [ ] Active accounts
- [ ] Balance aggregation

---

##### [TASK-005-006] Implement Account Repository
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/account-impl`
- **File**: `apps/backend/app/repositories/account.py`
- **Dependencies**: [TASK-005-005]
```python
class AccountRepository(BaseRepository[Account], IAccountRepository):
    async def find_by_user(self, user_id: UUID) -> List[Account]:
        query = select(Account).where(Account.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalars().all()
```
**Acceptance Criteria**:
- [ ] Eager loading options
- [ ] Balance calculation
- [ ] Sorting options
- [ ] Include transactions

---

##### [TASK-005-007] Create Transaction Repository Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/transaction-interface`
- **File**: `apps/backend/app/repositories/interfaces/transaction.py`
- **Dependencies**: [TASK-005-001]
```python
class ITransactionRepository(IRepository[Transaction]):
    @abstractmethod
    async def find_by_date_range(
        self, user_id: UUID, start: date, end: date
    ) -> List[Transaction]:
        pass
```
**Acceptance Criteria**:
- [ ] Date filtering
- [ ] Category filtering
- [ ] Amount range filter
- [ ] Pagination support

---

##### [TASK-005-008] Implement Transaction Repository
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/transaction-impl`
- **File**: `apps/backend/app/repositories/transaction.py`
- **Dependencies**: [TASK-005-007]
```python
class TransactionRepository(BaseRepository[Transaction], ITransactionRepository):
    async def find_by_date_range(
        self, user_id: UUID, start: date, end: date
    ) -> List[Transaction]:
        # Complex query with joins
        pass
```
**Acceptance Criteria**:
- [ ] Efficient date queries
- [ ] Join optimization
- [ ] Aggregation methods
- [ ] Bulk operations

---

##### [TASK-005-009] Create Category Repository Interface
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `repository/category-interface`
- **File**: `apps/backend/app/repositories/interfaces/category.py`
- **Dependencies**: [TASK-005-001]
```python
class ICategoryRepository(IRepository[Category]):
    @abstractmethod
    async def find_system_categories(self) -> List[Category]:
        pass
```
**Acceptance Criteria**:
- [ ] System vs custom
- [ ] Hierarchy support
- [ ] Usage statistics
- [ ] Icon/color queries

---

##### [TASK-005-010] Implement Category Repository
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/category-impl`
- **File**: `apps/backend/app/repositories/category.py`
- **Dependencies**: [TASK-005-009]
```python
class CategoryRepository(BaseRepository[Category], ICategoryRepository):
    async def find_system_categories(self) -> List[Category]:
        query = select(Category).where(Category.is_system == True)
        result = await self.db.execute(query)
        return result.scalars().all()
```
**Acceptance Criteria**:
- [ ] Caching system categories
- [ ] Tree structure support
- [ ] Usage counting
- [ ] Merge categories

---

##### [TASK-005-011] Create Budget Repository Interface
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `repository/budget-interface`
- **File**: `apps/backend/app/repositories/interfaces/budget.py`
- **Dependencies**: [TASK-005-001]
```python
class IBudgetRepository(IRepository[Budget]):
    @abstractmethod
    async def find_active_budgets(self, user_id: UUID) -> List[Budget]:
        pass
```
**Acceptance Criteria**:
- [ ] Active period filter
- [ ] Category grouping
- [ ] Spending calculation
- [ ] Alert status

---

##### [TASK-005-012] Implement Budget Repository
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/budget-impl`
- **File**: `apps/backend/app/repositories/budget.py`
- **Dependencies**: [TASK-005-011]
```python
class BudgetRepository(BaseRepository[Budget], IBudgetRepository):
    async def find_active_budgets(self, user_id: UUID) -> List[Budget]:
        # Complex query with spending calculation
        pass
```
**Acceptance Criteria**:
- [ ] Period validation
- [ ] Spending aggregation
- [ ] Progress calculation
- [ ] Alert triggering

---

##### [TASK-005-013] Create Repository Factory
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/factory`
- **File**: `apps/backend/app/repositories/factory.py`
- **Dependencies**: [TASK-005-004, TASK-005-006, TASK-005-008]
```python
class RepositoryFactory:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    def get_user_repository(self) -> IUserRepository:
        return UserRepository(User, self.db)
```
**Acceptance Criteria**:
- [ ] All repositories
- [ ] Singleton pattern
- [ ] Dependency injection
- [ ] Testing support

---

##### [TASK-005-014] Create Unit of Work Pattern
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/unit-of-work`
- **File**: `apps/backend/app/repositories/unit_of_work.py`
- **Dependencies**: [TASK-005-013]
```python
class UnitOfWork:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(User, db)
        self.accounts = AccountRepository(Account, db)
        
    async def commit(self):
        await self.db.commit()
```
**Acceptance Criteria**:
- [ ] Transaction management
- [ ] Rollback support
- [ ] Nested transactions
- [ ] Repository access

---

##### [TASK-005-015] Create Query Builder Helper
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/query-builder`
- **File**: `apps/backend/app/repositories/query_builder.py`
- **Dependencies**: [TASK-005-001]
```python
class QueryBuilder:
    def __init__(self, model):
        self.model = model
        self.query = select(model)
        
    def filter_by(self, **kwargs):
        # Dynamic filtering
        return self
```
**Acceptance Criteria**:
- [ ] Fluent interface
- [ ] Dynamic filters
- [ ] Sorting support
- [ ] Join builder

---

##### [TASK-005-016] Create Pagination Helper
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/pagination`
- **File**: `apps/backend/app/repositories/pagination.py`
- **Dependencies**: [TASK-005-001]
```python
class Paginator:
    def __init__(self, query, page: int, per_page: int):
        self.query = query
        self.page = page
        self.per_page = per_page
```
**Acceptance Criteria**:
- [ ] Offset/limit calculation
- [ ] Total count
- [ ] Has more flag
- [ ] Cursor pagination

---

##### [TASK-005-017] Create Repository Cache Layer
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/cache`
- **File**: `apps/backend/app/repositories/cache.py`
- **Dependencies**: [TASK-005-002]
```python
class CachedRepository:
    def __init__(self, repository, cache):
        self.repository = repository
        self.cache = cache
        
    async def find_by_id(self, id: UUID):
        # Check cache first
        # Fall back to repository
        pass
```
**Acceptance Criteria**:
- [ ] Cache key strategy
- [ ] TTL configuration
- [ ] Cache invalidation
- [ ] Metrics collection

---

##### [TASK-005-018] Create Bulk Operations Support
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/bulk-ops`
- **File**: `apps/backend/app/repositories/bulk.py`
- **Dependencies**: [TASK-005-002]
```python
async def bulk_insert(self, entities: List[T]):
    # Efficient bulk insert
    pass

async def bulk_update(self, entities: List[T]):
    # Efficient bulk update
    pass
```
**Acceptance Criteria**:
- [ ] Batch size optimization
- [ ] Transaction handling
- [ ] Error recovery
- [ ] Progress tracking

---

##### [TASK-005-019] Create Repository Tests - User
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `repository/test-user`
- **File**: `apps/backend/tests/unit/repositories/test_user.py`
- **Dependencies**: [TASK-005-004]
```python
async def test_find_by_email():
    # Test email lookup
    # Test case sensitivity
    # Test not found
    pass
```
**Acceptance Criteria**:
- [ ] All methods tested
- [ ] Edge cases covered
- [ ] Mock database
- [ ] Performance tests

---

##### [TASK-005-020] Create Repository Tests - Transaction
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `repository/test-transaction`
- **File**: `apps/backend/tests/unit/repositories/test_transaction.py`
- **Dependencies**: [TASK-005-008]
```python
async def test_find_by_date_range():
    # Test date filtering
    # Test pagination
    # Test aggregations
    pass
```
**Acceptance Criteria**:
- [ ] Date range tests
- [ ] Filter combinations
- [ ] Large dataset tests
- [ ] Aggregation accuracy

---

##### [TASK-005-021] Create Repository Tests - Account
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `repository/test-account`
- **File**: `apps/backend/tests/unit/repositories/test_account.py`
- **Dependencies**: [TASK-005-006]
**Acceptance Criteria**:
- [ ] User filtering
- [ ] Balance calculations
- [ ] Relationship loading
- [ ] Concurrent access

---

##### [TASK-005-022] Create Repository Tests - Budget
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `repository/test-budget`
- **File**: `apps/backend/tests/unit/repositories/test_budget.py`
- **Dependencies**: [TASK-005-012]
**Acceptance Criteria**:
- [ ] Period calculations
- [ ] Progress tracking
- [ ] Alert triggering
- [ ] Rollover logic

---

##### [TASK-005-023] Create Repository Integration Tests
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `repository/integration-tests`
- **File**: `apps/backend/tests/integration/test_repositories.py`
- **Dependencies**: [TASK-005-014]
```python
async def test_unit_of_work_transaction():
    # Test commit
    # Test rollback
    # Test nested transactions
    pass
```
**Acceptance Criteria**:
- [ ] Real database tests
- [ ] Transaction tests
- [ ] Concurrent operations
- [ ] Performance baseline

---

##### [TASK-005-024] Create Repository Performance Tests
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/performance-tests`
- **File**: `apps/backend/tests/performance/test_repository_perf.py`
- **Dependencies**: [TASK-005-023]
```python
async def test_bulk_insert_performance():
    # Test with 10k records
    # Measure time
    # Check memory usage
    pass
```
**Acceptance Criteria**:
- [ ] Bulk operation tests
- [ ] Query optimization
- [ ] N+1 detection
- [ ] Cache effectiveness

---

##### [TASK-005-025] Create Repository Documentation
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `repository/documentation`
- **File**: `docs/repositories.md`
- **Dependencies**: All repository tasks
```markdown
# Repository Pattern
## Architecture
## Usage Examples
## Best Practices
```
**Acceptance Criteria**:
- [ ] Pattern explanation
- [ ] Usage examples
- [ ] Testing guide
- [ ] Performance tips

---

##### [TASK-005-026] Create Repository Error Handling
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/error-handling`
- **File**: `apps/backend/app/repositories/exceptions.py`
- **Dependencies**: [TASK-005-002]
```python
class RepositoryException(Exception):
    pass

class EntityNotFoundException(RepositoryException):
    pass
```
**Acceptance Criteria**:
- [ ] Custom exceptions
- [ ] Error mapping
- [ ] Retry logic
- [ ] Logging integration

---

##### [TASK-005-027] Create Repository Audit Support
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/audit`
- **File**: `apps/backend/app/repositories/auditable.py`
- **Dependencies**: [TASK-005-002]
```python
class AuditableRepository(BaseRepository):
    async def save(self, entity: T) -> T:
        # Log to audit table
        # Save entity
        pass
```
**Acceptance Criteria**:
- [ ] Automatic audit logging
- [ ] Change tracking
- [ ] User context
- [ ] Metadata capture

---

##### [TASK-005-028] Create Repository Migration Helper
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `repository/migration-helper`
- **File**: `apps/backend/app/repositories/migration.py`
- **Dependencies**: [TASK-005-002]
```python
class MigrationHelper:
    async def migrate_data(self, from_model, to_model, transformer):
        # Batch migration
        # Progress tracking
        pass
```
**Acceptance Criteria**:
- [ ] Batch processing
- [ ] Progress tracking
- [ ] Error recovery
- [ ] Rollback support

---

## [EPIC-003] Authentication System (21 points → 70 tasks)

### [STORY-006] JWT Authentication (13 points → 45 tasks)

#### Phase 2.3: Core Authentication

##### [TASK-006-001] Create Password Utilities
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/password-utils`
- **File**: `apps/backend/app/core/security/password.py`
- **Dependencies**: None
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```
**Acceptance Criteria**:
- [ ] Bcrypt hashing
- [ ] Salt generation
- [ ] Password verification
- [ ] Strength validation

---

##### [TASK-006-002] Create JWT Token Handler
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/jwt-handler`
- **File**: `apps/backend/app/core/security/token.py`
- **Dependencies**: [TASK-006-001]
```python
def create_access_token(data: dict) -> str:
    # Create JWT token
    pass

def verify_token(token: str) -> dict:
    # Verify and decode
    pass
```
**Acceptance Criteria**:
- [ ] Token generation
- [ ] Token verification
- [ ] Expiry handling
- [ ] Claims validation

---

##### [TASK-006-003] Create Auth Config
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `auth/config`
- **File**: `apps/backend/app/core/security/config.py`
- **Dependencies**: None
```python
class AuthSettings:
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
```
**Acceptance Criteria**:
- [ ] Environment variables
- [ ] Token expiry config
- [ ] Algorithm selection
- [ ] Security settings

---

##### [TASK-006-004] Create User Registration Schema
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `auth/register-schema`
- **File**: `apps/backend/app/schemas/auth/register.py`
- **Dependencies**: None
```python
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    password_confirm: str
    
    @validator('password')
    def validate_password_strength(cls, v):
        # Check password strength
        pass
```
**Acceptance Criteria**:
- [ ] Email validation
- [ ] Password strength
- [ ] Password match
- [ ] Terms acceptance

---

##### [TASK-006-005] Create Login Schema
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `auth/login-schema`
- **File**: `apps/backend/app/schemas/auth/login.py`
- **Dependencies**: None
```python
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```
**Acceptance Criteria**:
- [ ] Input validation
- [ ] Response format
- [ ] Error messages
- [ ] Rate limit info

---

##### [TASK-006-006] Create Auth Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/service-interface`
- **File**: `apps/backend/app/services/interfaces/auth.py`
- **Dependencies**: [TASK-005-003]
```python
class IAuthService(ABC):
    @abstractmethod
    async def register(self, data: UserRegister) -> User:
        pass
    
    @abstractmethod
    async def login(self, email: str, password: str) -> TokenResponse:
        pass
```
**Acceptance Criteria**:
- [ ] Registration method
- [ ] Login method
- [ ] Logout method
- [ ] Token refresh method

---

##### [TASK-006-007] Implement Auth Service
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `auth/service-impl`
- **File**: `apps/backend/app/services/auth.py`
- **Dependencies**: [TASK-006-006, TASK-006-002]
```python
class AuthService(IAuthService):
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
        
    async def register(self, data: UserRegister) -> User:
        # Check existing email
        # Hash password
        # Create user
        # Send verification email
        pass
```
**Acceptance Criteria**:
- [ ] Email uniqueness check
- [ ] Password hashing
- [ ] User creation
- [ ] Welcome email trigger

---

##### [TASK-006-008] Create Register Endpoint
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/register-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/auth/register.py`
- **Dependencies**: [TASK-006-007]
```python
@router.post("/register", response_model=UserResponse)
async def register(
    data: UserRegister,
    auth_service: IAuthService = Depends(get_auth_service)
):
    # Validate input
    # Call service
    # Return response
    pass
```
**Acceptance Criteria**:
- [ ] Input validation
- [ ] Service integration
- [ ] Error handling
- [ ] Success response

---

##### [TASK-006-009] Create Login Endpoint
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/login-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/auth/login.py`
- **Dependencies**: [TASK-006-007]
```python
@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: IAuthService = Depends(get_auth_service)
):
    # Authenticate user
    # Generate tokens
    # Return tokens
    pass
```
**Acceptance Criteria**:
- [ ] OAuth2 compliance
- [ ] Token generation
- [ ] Failed attempt tracking
- [ ] Device fingerprinting

---

##### [TASK-006-010] Create Token Refresh Endpoint
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/refresh-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/auth/refresh.py`
- **Dependencies**: [TASK-006-002]
```python
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    auth_service: IAuthService = Depends(get_auth_service)
):
    # Verify refresh token
    # Generate new access token
    pass
```
**Acceptance Criteria**:
- [ ] Refresh token validation
- [ ] New token generation
- [ ] Rotation strategy
- [ ] Blacklist check

---

##### [TASK-006-011] Create Logout Endpoint
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/logout-endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/auth/logout.py`
- **Dependencies**: [TASK-006-002]
```python
@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    auth_service: IAuthService = Depends(get_auth_service)
):
    # Invalidate token
    # Clear session
    pass
```
**Acceptance Criteria**:
- [ ] Token invalidation
- [ ] Session cleanup
- [ ] All devices option
- [ ] Audit logging

---

##### [TASK-006-012] Create Current User Dependency
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/current-user`
- **File**: `apps/backend/app/api/deps/auth.py`
- **Dependencies**: [TASK-006-002]
```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: IUserRepository = Depends(get_user_repository)
) -> User:
    # Verify token
    # Get user from token
    # Check user active
    pass
```
**Acceptance Criteria**:
- [ ] Token extraction
- [ ] Token validation
- [ ] User lookup
- [ ] Active check

---

##### [TASK-006-013] Create Permission Decorator
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/permissions`
- **File**: `apps/backend/app/core/security/permissions.py`
- **Dependencies**: [TASK-006-012]
```python
def require_permission(permission: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Check permission
            pass
        return wrapper
    return decorator
```
**Acceptance Criteria**:
- [ ] Permission check
- [ ] Role-based access
- [ ] Error messages
- [ ] Audit logging

---

##### [TASK-006-014] Create Rate Limiting Middleware
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/rate-limit`
- **File**: `apps/backend/app/middleware/rate_limit.py`
- **Dependencies**: None
```python
class RateLimitMiddleware:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    async def __call__(self, request, call_next):
        # Check rate limit
        # Increment counter
        # Return 429 if exceeded
        pass
```
**Acceptance Criteria**:
- [ ] Redis integration
- [ ] Per-endpoint limits
- [ ] User tier limits
- [ ] Headers with limit info

---

##### [TASK-006-015] Create Session Management
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/session`
- **File**: `apps/backend/app/services/session.py`
- **Dependencies**: [TASK-006-002]
```python
class SessionService:
    async def create_session(self, user_id: UUID) -> str:
        # Create session
        # Store in Redis
        pass
    
    async def get_session(self, session_id: str) -> dict:
        # Get from Redis
        pass
```
**Acceptance Criteria**:
- [ ] Session creation
- [ ] Session storage
- [ ] Session expiry
- [ ] Multi-device support

---

##### [TASK-006-016] Create Email Verification Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/email-verification`
- **File**: `apps/backend/app/services/email_verification.py`
- **Dependencies**: [TASK-006-007]
```python
class EmailVerificationService:
    async def send_verification_email(self, user: User):
        # Generate token
        # Send email
        pass
    
    async def verify_email(self, token: str):
        # Verify token
        # Update user
        pass
```
**Acceptance Criteria**:
- [ ] Token generation
- [ ] Email sending
- [ ] Token validation
- [ ] User activation

---

##### [TASK-006-017] Create Password Reset Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/password-reset`
- **File**: `apps/backend/app/services/password_reset.py`
- **Dependencies**: [TASK-006-001]
```python
class PasswordResetService:
    async def request_reset(self, email: str):
        # Generate reset token
        # Send email
        pass
    
    async def reset_password(self, token: str, new_password: str):
        # Validate token
        # Update password
        pass
```
**Acceptance Criteria**:
- [ ] Reset token generation
- [ ] Email notification
- [ ] Token expiry
- [ ] Password update

---

##### [TASK-006-018] Create Two-Factor Auth Service
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `auth/2fa`
- **File**: `apps/backend/app/services/two_factor.py`
- **Dependencies**: [TASK-006-007]
```python
class TwoFactorService:
    async def enable_2fa(self, user_id: UUID) -> str:
        # Generate secret
        # Return QR code
        pass
    
    async def verify_2fa(self, user_id: UUID, code: str) -> bool:
        # Verify TOTP code
        pass
```
**Acceptance Criteria**:
- [ ] TOTP generation
- [ ] QR code generation
- [ ] Code verification
- [ ] Backup codes

---

##### [TASK-006-019] Create Auth Frontend Store
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/frontend-store`
- **File**: `apps/web/src/store/auth.ts`
- **Dependencies**: None
```typescript
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    tokens: null,
    isAuthenticated: false
  },
  reducers: {
    loginSuccess: (state, action) => {
      // Update state
    }
  }
})
```
**Acceptance Criteria**:
- [ ] User state management
- [ ] Token storage
- [ ] Authentication status
- [ ] Persist/rehydrate

---

##### [TASK-006-020] Create Auth API Client
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `auth/api-client`
- **File**: `apps/web/src/services/auth.ts`
- **Dependencies**: [TASK-006-019]
```typescript
export const authAPI = {
  login: async (email: string, password: string) => {
    // API call
  },
  register: async (data: RegisterData) => {
    // API call
  },
  logout: async () => {
    // API call
  }
}
```
**Acceptance Criteria**:
- [ ] All auth endpoints
- [ ] Error handling
- [ ] Token management
- [ ] Interceptors setup

---

##### [TASK-006-021] Create Login Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/login-component`
- **File**: `apps/web/src/features/auth/components/LoginForm.tsx`
- **Dependencies**: [TASK-006-020]
```typescript
export const LoginForm: React.FC = () => {
  // Form state
  // Validation
  // Submit handler
  return (
    <form>
      {/* Form fields */}
    </form>
  )
}
```
**Acceptance Criteria**:
- [ ] Form validation
- [ ] Error display
- [ ] Loading state
- [ ] Remember me option

---

##### [TASK-006-022] Create Register Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/register-component`
- **File**: `apps/web/src/features/auth/components/RegisterForm.tsx`
- **Dependencies**: [TASK-006-020]
```typescript
export const RegisterForm: React.FC = () => {
  // Form state
  // Password strength
  // Submit handler
  return (
    <form>
      {/* Form fields */}
    </form>
  )
}
```
**Acceptance Criteria**:
- [ ] Form validation
- [ ] Password strength meter
- [ ] Terms checkbox
- [ ] Success redirect

---

##### [TASK-006-023] Create Protected Route Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `auth/protected-route`
- **File**: `apps/web/src/components/ProtectedRoute.tsx`
- **Dependencies**: [TASK-006-019]
```typescript
export const ProtectedRoute: React.FC = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  return <>{children}</>
}
```
**Acceptance Criteria**:
- [ ] Auth check
- [ ] Redirect logic
- [ ] Loading state
- [ ] Role-based access

---

##### [TASK-006-024] Create Auth Layout Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `auth/layout`
- **File**: `apps/web/src/features/auth/components/AuthLayout.tsx`
- **Dependencies**: None
```typescript
export const AuthLayout: React.FC = ({ children }) => {
  return (
    <div className="auth-layout">
      {/* Logo, background, etc */}
      {children}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Responsive design
- [ ] Branding elements
- [ ] Animation
- [ ] Accessibility

---

##### [TASK-006-025] Create Password Reset Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/password-reset-ui`
- **File**: `apps/web/src/features/auth/components/PasswordReset.tsx`
- **Dependencies**: [TASK-006-020]
```typescript
export const PasswordResetForm: React.FC = () => {
  // Email input
  // Submit handler
  // Success message
  return (
    <form>
      {/* Form fields */}
    </form>
  )
}
```
**Acceptance Criteria**:
- [ ] Email validation
- [ ] Success feedback
- [ ] Error handling
- [ ] Rate limit display

---

##### [TASK-006-026] Create Email Verification Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `auth/email-verify-ui`
- **File**: `apps/web/src/features/auth/components/EmailVerification.tsx`
- **Dependencies**: [TASK-006-020]
```typescript
export const EmailVerification: React.FC = () => {
  // Get token from URL
  // Verify on mount
  // Show result
  return (
    <div>
      {/* Verification status */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Token extraction
- [ ] Auto-verification
- [ ] Status display
- [ ] Redirect after success

---

##### [TASK-006-027] Create Auth Unit Tests - Service
- **Points**: 0.5
- **Agent**: Copilot
- **Branch**: `auth/test-service`
- **File**: `apps/backend/tests/unit/services/test_auth.py`
- **Dependencies**: [TASK-006-007]
```python
async def test_register_success():
    # Test successful registration
    pass

async def test_register_duplicate_email():
    # Test duplicate email
    pass
```
**Acceptance Criteria**:
- [ ] Registration tests
- [ ] Login tests
- [ ] Token tests
- [ ] Edge cases

---

##### [TASK-006-028] Create Auth Unit Tests - Endpoints
- **Points**: 0.5
- **Agent**: Copilot
- **Branch**: `auth/test-endpoints`
- **File**: `apps/backend/tests/unit/api/test_auth.py`
- **Dependencies**: [TASK-006-008, TASK-006-009]
```python
async def test_register_endpoint():
    # Test registration endpoint
    pass

async def test_login_endpoint():
    # Test login endpoint
    pass
```
**Acceptance Criteria**:
- [ ] All endpoints tested
- [ ] Status codes verified
- [ ] Response format
- [ ] Error scenarios

---

##### [TASK-006-029] Create Auth Integration Tests
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/integration-tests`
- **File**: `apps/backend/tests/integration/test_auth_flow.py`
- **Dependencies**: [TASK-006-027, TASK-006-028]
```python
async def test_complete_auth_flow():
    # Register
    # Login
    # Refresh token
    # Logout
    pass
```
**Acceptance Criteria**:
- [ ] Full flow test
- [ ] Database integration
- [ ] Token lifecycle
- [ ] Session management

---

##### [TASK-006-030] Create Auth E2E Tests
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/e2e-tests`
- **File**: `apps/web/tests/e2e/auth.spec.ts`
- **Dependencies**: [TASK-006-021, TASK-006-022]
```typescript
test('user can register and login', async ({ page }) => {
  // Navigate to register
  // Fill form
  // Submit
  // Verify redirect
  // Login
})
```
**Acceptance Criteria**:
- [ ] Registration flow
- [ ] Login flow
- [ ] Password reset flow
- [ ] Error scenarios

---

##### [TASK-006-031] Create Security Tests
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `auth/security-tests`
- **File**: `apps/backend/tests/security/test_auth_security.py`
- **Dependencies**: [TASK-006-007]
```python
async def test_password_requirements():
    # Test weak passwords
    pass

async def test_rate_limiting():
    # Test rate limits
    pass
```
**Acceptance Criteria**:
- [ ] Password strength
- [ ] Injection attacks
- [ ] Rate limiting
- [ ] Token security

---

##### [TASK-006-032] Create Auth Middleware Tests
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `auth/middleware-tests`
- **File**: `apps/backend/tests/unit/middleware/test_auth.py`
- **Dependencies**: [TASK-006-014]
```python
async def test_rate_limit_middleware():
    # Test rate limiting
    pass
```
**Acceptance Criteria**:
- [ ] Rate limit logic
- [ ] Headers validation
- [ ] Redis integration
- [ ] Error responses

---

##### [TASK-006-033] Create Frontend Auth Tests
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `auth/frontend-tests`
- **File**: `apps/web/tests/unit/auth/auth.test.tsx`
- **Dependencies**: [TASK-006-021, TASK-006-022]
```typescript
describe('Auth Components', () => {
  test('LoginForm validates input', () => {
    // Test validation
  })
})
```
**Acceptance Criteria**:
- [ ] Component rendering
- [ ] Form validation
- [ ] API calls mocked
- [ ] State updates

---

##### [TASK-006-034] Create Auth Documentation
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/documentation`
- **File**: `docs/authentication.md`
- **Dependencies**: All auth tasks
```markdown
# Authentication
## JWT Strategy
## Endpoints
## Security Considerations
```
**Acceptance Criteria**:
- [ ] Architecture overview
- [ ] API documentation
- [ ] Security notes
- [ ] Usage examples

---

##### [TASK-006-035] Create Auth Monitoring
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/monitoring`
- **File**: `apps/backend/app/monitoring/auth.py`
- **Dependencies**: [TASK-006-007]
```python
async def track_login_attempt(success: bool, user_id: UUID):
    # Log to monitoring
    pass
```
**Acceptance Criteria**:
- [ ] Login attempts
- [ ] Failed attempts
- [ ] Token metrics
- [ ] Alert rules

---

##### [TASK-006-036] Create Auth Audit Logging
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/audit-log`
- **File**: `apps/backend/app/services/audit.py`
- **Dependencies**: [TASK-004-009]
```python
async def log_auth_event(event_type: str, user_id: UUID, metadata: dict):
    # Log to audit table
    pass
```
**Acceptance Criteria**:
- [ ] Login events
- [ ] Logout events
- [ ] Password changes
- [ ] Permission changes

---

##### [TASK-006-037] Create CORS Configuration
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `auth/cors`
- **File**: `apps/backend/app/middleware/cors.py`
- **Dependencies**: None
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Acceptance Criteria**:
- [ ] Origin validation
- [ ] Credentials support
- [ ] Headers configuration
- [ ] Environment-based

---

##### [TASK-006-038] Create Security Headers
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `auth/security-headers`
- **File**: `apps/backend/app/middleware/security.py`
- **Dependencies**: None
```python
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # More headers
    return response
```
**Acceptance Criteria**:
- [ ] CSP headers
- [ ] XSS protection
- [ ] Frame options
- [ ] HSTS

---

##### [TASK-006-039] Create API Key Authentication
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/api-key`
- **File**: `apps/backend/app/core/security/api_key.py`
- **Dependencies**: [TASK-006-012]
```python
async def get_api_key_user(
    api_key: str = Security(api_key_header)
) -> User:
    # Validate API key
    # Return user
    pass
```
**Acceptance Criteria**:
- [ ] Key generation
- [ ] Key validation
- [ ] Rate limiting
- [ ] Revocation

---

##### [TASK-006-040] Create OAuth2 Support
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `auth/oauth2`
- **File**: `apps/backend/app/services/oauth2.py`
- **Dependencies**: [TASK-006-007]
```python
class OAuth2Service:
    async def google_login(self, token: str) -> User:
        # Verify Google token
        # Create/update user
        pass
```
**Acceptance Criteria**:
- [ ] Google OAuth
- [ ] Token validation
- [ ] User creation
- [ ] Profile sync

---

##### [TASK-006-041] Create Device Management
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/devices`
- **File**: `apps/backend/app/services/devices.py`
- **Dependencies**: [TASK-006-015]
```python
class DeviceService:
    async def register_device(self, user_id: UUID, device_info: dict):
        # Register device
        # Generate device token
        pass
```
**Acceptance Criteria**:
- [ ] Device registration
- [ ] Device listing
- [ ] Remote logout
- [ ] Trust device option

---

##### [TASK-006-042] Create Account Lockout Service
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/lockout`
- **File**: `apps/backend/app/services/lockout.py`
- **Dependencies**: [TASK-006-007]
```python
class LockoutService:
    async def check_lockout(self, email: str) -> bool:
        # Check failed attempts
        # Return lockout status
        pass
```
**Acceptance Criteria**:
- [ ] Failed attempt tracking
- [ ] Lockout logic
- [ ] Unlock mechanism
- [ ] Admin override

---

##### [TASK-006-043] Create SSO Support
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `auth/sso`
- **File**: `apps/backend/app/services/sso.py`
- **Dependencies**: [TASK-006-007]
```python
class SSOService:
    async def saml_login(self, saml_response: str) -> User:
        # Parse SAML
        # Validate signature
        # Create/update user
        pass
```
**Acceptance Criteria**:
- [ ] SAML support
- [ ] Metadata endpoint
- [ ] Attribute mapping
- [ ] Multi-tenant

---

##### [TASK-006-044] Create Impersonation Support
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `auth/impersonation`
- **File**: `apps/backend/app/services/impersonation.py`
- **Dependencies**: [TASK-006-013]
```python
class ImpersonationService:
    async def impersonate(self, admin_id: UUID, user_id: UUID) -> str:
        # Check admin permission
        # Create impersonation token
        pass
```
**Acceptance Criteria**:
- [ ] Admin only
- [ ] Audit logging
- [ ] Time limited
- [ ] Original user tracking

---

##### [TASK-006-045] Create Auth Performance Tests
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `auth/performance`
- **File**: `apps/backend/tests/performance/test_auth_perf.py`
- **Dependencies**: [TASK-006-007]
```python
async def test_login_performance():
    # Test with 1000 concurrent logins
    pass
```
**Acceptance Criteria**:
- [ ] Load testing
- [ ] Response times
- [ ] Token generation speed
- [ ] Database impact

---

### [STORY-007] User Profile Management (8 points → 25 tasks)

#### Phase 2.4: User Management

##### [TASK-007-001] Create User Profile Schema
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/profile-schema`
- **File**: `apps/backend/app/schemas/user/profile.py`
- **Dependencies**: None
```python
class UserProfile(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    timezone: str = "UTC"
    language: str = "en"
```
**Acceptance Criteria**:
- [ ] Profile fields
- [ ] Validation rules
- [ ] Optional fields
- [ ] Defaults

---

##### [TASK-007-002] Create User Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/service-interface`
- **File**: `apps/backend/app/services/interfaces/user.py`
- **Dependencies**: [TASK-005-003]
```python
class IUserService(ABC):
    @abstractmethod
    async def get_profile(self, user_id: UUID) -> UserProfile:
        pass
    
    @abstractmethod
    async def update_profile(self, user_id: UUID, data: UserProfile) -> User:
        pass
```
**Acceptance Criteria**:
- [ ] Profile methods
- [ ] Settings methods
- [ ] Deletion methods
- [ ] Export methods

---

##### [TASK-007-003] Implement User Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `user/service-impl`
- **File**: `apps/backend/app/services/user.py`
- **Dependencies**: [TASK-007-002]
```python
class UserService(IUserService):
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
        
    async def get_profile(self, user_id: UUID) -> UserProfile:
        # Get user
        # Return profile
        pass
```
**Acceptance Criteria**:
- [ ] Profile retrieval
- [ ] Profile update
- [ ] Validation
- [ ] Audit logging

---

##### [TASK-007-004] Create Profile Endpoints
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `user/profile-endpoints`
- **File**: `apps/backend/app/api/v1/endpoints/user/profile.py`
- **Dependencies**: [TASK-007-003]
```python
@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    # Return user profile
    pass

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    data: UserProfile,
    current_user: User = Depends(get_current_user)
):
    # Update profile
    pass
```
**Acceptance Criteria**:
- [ ] GET endpoint
- [ ] PUT endpoint
- [ ] Validation
- [ ] Auth required

---

##### [TASK-007-005] Create Settings Schema
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/settings-schema`
- **File**: `apps/backend/app/schemas/user/settings.py`
- **Dependencies**: None
```python
class UserSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    currency: str = "EUR"
    date_format: str = "DD/MM/YYYY"
```
**Acceptance Criteria**:
- [ ] Notification settings
- [ ] Display settings
- [ ] Privacy settings
- [ ] Defaults

---

##### [TASK-007-006] Create Settings Endpoints
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/settings-endpoints`
- **File**: `apps/backend/app/api/v1/endpoints/user/settings.py`
- **Dependencies**: [TASK-007-005]
```python
@router.get("/settings", response_model=UserSettings)
async def get_settings(
    current_user: User = Depends(get_current_user)
):
    pass

@router.put("/settings", response_model=UserSettings)
async def update_settings(
    data: UserSettings,
    current_user: User = Depends(get_current_user)
):
    pass
```
**Acceptance Criteria**:
- [ ] GET endpoint
- [ ] PUT endpoint
- [ ] Validation
- [ ] Cache invalidation

---

##### [TASK-007-007] Create Password Change Endpoint
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/password-change`
- **File**: `apps/backend/app/api/v1/endpoints/user/password.py`
- **Dependencies**: [TASK-006-001]
```python
@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user)
):
    # Verify current password
    # Update password
    pass
```
**Acceptance Criteria**:
- [ ] Current password check
- [ ] New password validation
- [ ] Hash update
- [ ] Session invalidation

---

##### [TASK-007-008] Create Account Deletion
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `user/deletion`
- **File**: `apps/backend/app/services/user_deletion.py`
- **Dependencies**: [TASK-007-003]
```python
class UserDeletionService:
    async def soft_delete(self, user_id: UUID):
        # Mark as deleted
        # Anonymize data
        pass
    
    async def hard_delete(self, user_id: UUID):
        # Delete all data
        pass
```
**Acceptance Criteria**:
- [ ] Soft delete
- [ ] Data anonymization
- [ ] GDPR compliance
- [ ] Cascade deletion

---

##### [TASK-007-009] Create Data Export Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `user/data-export`
- **File**: `apps/backend/app/services/data_export.py`
- **Dependencies**: [TASK-007-003]
```python
class DataExportService:
    async def export_user_data(self, user_id: UUID) -> bytes:
        # Collect all user data
        # Generate JSON/CSV
        # Return file
        pass
```
**Acceptance Criteria**:
- [ ] All data included
- [ ] Multiple formats
- [ ] GDPR compliance
- [ ] Async processing

---

##### [TASK-007-010] Create Profile Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `user/profile-component`
- **File**: `apps/web/src/features/user/components/Profile.tsx`
- **Dependencies**: None
```typescript
export const Profile: React.FC = () => {
  // Fetch profile
  // Display form
  // Handle update
  return (
    <form>
      {/* Profile fields */}
    </form>
  )
}
```
**Acceptance Criteria**:
- [ ] Form fields
- [ ] Validation
- [ ] Photo upload
- [ ] Save feedback

---

##### [TASK-007-011] Create Settings Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `user/settings-component`
- **File**: `apps/web/src/features/user/components/Settings.tsx`
- **Dependencies**: None
```typescript
export const Settings: React.FC = () => {
  // Settings sections
  // Toggle switches
  // Save handler
  return (
    <div>
      {/* Settings sections */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Section organization
- [ ] Toggle controls
- [ ] Instant save
- [ ] Confirmation dialogs

---

##### [TASK-007-012] Create User Store
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `user/frontend-store`
- **File**: `apps/web/src/store/user.ts`
- **Dependencies**: None
```typescript
const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null,
    settings: null,
    loading: false
  },
  reducers: {
    // Actions
  }
})
```
**Acceptance Criteria**:
- [ ] Profile state
- [ ] Settings state
- [ ] Loading states
- [ ] Error handling

---

##### [TASK-007-013] Create User API Client
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `user/api-client`
- **File**: `apps/web/src/services/user.ts`
- **Dependencies**: [TASK-007-012]
```typescript
export const userAPI = {
  getProfile: async () => {
    // API call
  },
  updateProfile: async (data: ProfileData) => {
    // API call
  }
}
```
**Acceptance Criteria**:
- [ ] All endpoints
- [ ] Error handling
- [ ] Type safety
- [ ] Interceptors

---

##### [TASK-007-014] Create Avatar Upload
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `user/avatar-upload`
- **File**: `apps/web/src/features/user/components/AvatarUpload.tsx`
- **Dependencies**: [TASK-007-010]
```typescript
export const AvatarUpload: React.FC = () => {
  // File input
  // Preview
  // Upload handler
  return (
    <div>
      {/* Upload interface */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] File selection
- [ ] Image preview
- [ ] Crop tool
- [ ] Upload progress

---

##### [TASK-007-015] Create Notification Settings
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `user/notifications-ui`
- **File**: `apps/web/src/features/user/components/NotificationSettings.tsx`
- **Dependencies**: [TASK-007-011]
```typescript
export const NotificationSettings: React.FC = () => {
  // Notification types
  // Toggle switches
  // Channel preferences
  return (
    <div>
      {/* Settings list */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Email settings
- [ ] Push settings
- [ ] Frequency options
- [ ] Test notification

---

##### [TASK-007-016] Create Privacy Settings
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `user/privacy-ui`
- **File**: `apps/web/src/features/user/components/PrivacySettings.tsx`
- **Dependencies**: [TASK-007-011]
```typescript
export const PrivacySettings: React.FC = () => {
  // Privacy options
  // Data sharing
  // Export/delete
  return (
    <div>
      {/* Privacy controls */}
    </div>
  )
}
```
**Acceptance Criteria**:
- [ ] Data visibility
- [ ] Sharing options
- [ ] Export button
- [ ] Delete account

---

##### [TASK-007-017] Create User Tests - Service
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `user/test-service`
- **File**: `apps/backend/tests/unit/services/test_user.py`
- **Dependencies**: [TASK-007-003]
```python
async def test_get_profile():
    # Test profile retrieval
    pass

async def test_update_profile():
    # Test profile update
    pass
```
**Acceptance Criteria**:
- [ ] All methods tested
- [ ] Edge cases
- [ ] Validation tests
- [ ] Permission tests

---

##### [TASK-007-018] Create User Tests - Endpoints
- **Points**: 0.3
- **Agent**: Copilot
- **Branch**: `user/test-endpoints`
- **File**: `apps/backend/tests/unit/api/test_user.py`
- **Dependencies**: [TASK-007-004]
```python
async def test_profile_endpoints():
    # Test GET /profile
    # Test PUT /profile
    pass
```
**Acceptance Criteria**:
- [ ] All endpoints
- [ ] Auth required
- [ ] Validation
- [ ] Error cases

---

##### [TASK-007-019] Create User Integration Tests
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/integration-tests`
- **File**: `apps/backend/tests/integration/test_user_flow.py`
- **Dependencies**: [TASK-007-017, TASK-007-018]
```python
async def test_user_management_flow():
    # Create user
    # Update profile
    # Change settings
    # Delete account
    pass
```
**Acceptance Criteria**:
- [ ] Full lifecycle
- [ ] Data persistence
- [ ] Cache behavior
- [ ] Audit logs

---

##### [TASK-007-020] Create User E2E Tests
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `user/e2e-tests`
- **File**: `apps/web/tests/e2e/user.spec.ts`
- **Dependencies**: [TASK-007-010, TASK-007-011]
```typescript
test('user can update profile', async ({ page }) => {
  // Navigate to profile
  // Update fields
  // Save
  // Verify changes
})
```
**Acceptance Criteria**:
- [ ] Profile update
- [ ] Settings update
- [ ] Avatar upload
- [ ] Data export

---

##### [TASK-007-021] Create User Documentation
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `user/documentation`
- **File**: `docs/user_management.md`
- **Dependencies**: All user tasks
```markdown
# User Management
## Profile
## Settings
## Privacy
```
**Acceptance Criteria**:
- [ ] API docs
- [ ] Data model
- [ ] Privacy policy
- [ ] GDPR notes

---

##### [TASK-007-022] Create User Monitoring
- **Points**: 0.2
- **Agent**: Claude-Backend
- **Branch**: `user/monitoring`
- **File**: `apps/backend/app/monitoring/user.py`
- **Dependencies**: [TASK-007-003]
```python
async def track_profile_update(user_id: UUID):
    # Log to monitoring
    pass
```
**Acceptance Criteria**:
- [ ] Profile updates
- [ ] Settings changes
- [ ] Deletion requests
- [ ] Export requests

---

##### [TASK-007-023] Create User Analytics
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/analytics`
- **File**: `apps/backend/app/services/user_analytics.py`
- **Dependencies**: [TASK-007-003]
```python
class UserAnalyticsService:
    async def get_user_stats(self, user_id: UUID):
        # Active days
        # Feature usage
        # Engagement score
        pass
```
**Acceptance Criteria**:
- [ ] Usage metrics
- [ ] Engagement tracking
- [ ] Feature adoption
- [ ] Retention data

---

##### [TASK-007-024] Create User Segmentation
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/segmentation`
- **File**: `apps/backend/app/services/segmentation.py`
- **Dependencies**: [TASK-007-023]
```python
class SegmentationService:
    async def segment_users(self):
        # Classify users
        # Update segments
        pass
```
**Acceptance Criteria**:
- [ ] Behavior segments
- [ ] Value segments
- [ ] Activity segments
- [ ] Auto-update

---

##### [TASK-007-025] Create User Migration
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `user/migration`
- **File**: `apps/backend/scripts/migrate_users.py`
- **Dependencies**: [TASK-007-003]
```python
async def migrate_user_data():
    # Old schema to new
    # Data transformation
    # Validation
    pass
```
**Acceptance Criteria**:
- [ ] Schema migration
- [ ] Data validation
- [ ] Rollback support
- [ ] Progress tracking

---

## Summary Statistics for Milestone 2

```yaml
Total Micro-Tasks: 118
Parallel Execution Paths: 6
Estimated Completion: Week 3 (5-7 days with 4 agents)

Critical Path:
1. Database schema (TASK-004-001 to 004-014)
2. Repository pattern (TASK-005-001 to 005-014)
3. Auth service (TASK-006-001 to 006-012)
4. User management (TASK-007-001 to 007-004)

Agent Assignment:
- Claude-Backend: 65 tasks (database, repositories, auth, services)
- Claude-Frontend: 28 tasks (auth UI, user UI, components)
- Copilot: 20 tasks (testing, documentation)
- Claude-Security: 5 tasks (security, auth hardening)

Branch Strategy:
- database/* - All database related work
- repository/* - Repository pattern implementation
- auth/* - Authentication system
- user/* - User management
```
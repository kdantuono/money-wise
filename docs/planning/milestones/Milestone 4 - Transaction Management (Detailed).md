# Milestone 4: Transaction Management - Detailed Breakdown
## 39 Points → 145 Micro-Tasks

---

## Quick Reference for Claude Code

```yaml
Total Tasks: 145
Parallel Branches: 6
Estimated Time: Week 5
Critical Path: TASK-017 (API) → TASK-020 (categorization) → TASK-018 (UI)
Dependencies: Milestones 1-3 complete, especially Plaid integration
```

---

## [EPIC-004] Transaction System (26 points → 98 tasks)

### [STORY-007] Transaction CRUD Operations (13 points → 49 tasks)

#### Phase 4.1: Core Transaction Management

##### [TASK-017-001] Create Transaction Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `transactions/service-interface`
- **File**: `apps/backend/app/services/interfaces/transaction.py`
- **Dependencies**: Database models from Milestone 2
```python
class ITransactionService(ABC):
    @abstractmethod
    async def create_transaction(
        self, user_id: str, data: TransactionCreate
    ) -> Transaction:
        pass
    
    @abstractmethod
    async def get_transactions(
        self, user_id: str, filters: TransactionFilters
    ) -> Page[Transaction]:
        pass
```
**Acceptance Criteria**:
- [ ] CRUD methods defined
- [ ] Filter support
- [ ] Bulk operations
- [ ] Export methods

---

##### [TASK-017-002] Implement Transaction Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `transactions/service-impl`
- **File**: `apps/backend/app/services/transaction.py`
- **Dependencies**: [TASK-017-001]
```python
class TransactionService(ITransactionService):
    def __init__(self, transaction_repo: ITransactionRepository):
        self.repo = transaction_repo
        
    async def create_transaction(
        self, user_id: str, data: TransactionCreate
    ) -> Transaction:
        # Validate account ownership
        # Create transaction
        # Update balance
        # Trigger categorization
        pass
```
**Acceptance Criteria**:
- [ ] Account validation
- [ ] Balance update
- [ ] Category assignment
- [ ] Event emission

---

##### [TASK-017-003] Create Transaction Schemas
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `transactions/schemas`
- **File**: `apps/backend/app/schemas/transaction.py`
- **Dependencies**: None
```python
class TransactionCreate(BaseModel):
    account_id: UUID
    amount: Decimal
    description: str
    transaction_date: date
    category_id: Optional[int] = None
    
class TransactionUpdate(BaseModel):
    amount: Optional[Decimal]
    description: Optional[str]
    category_id: Optional[int]
```
**Acceptance Criteria**:
- [ ] Create schema
- [ ] Update schema
- [ ] Filter schema
- [ ] Response schema

---

##### [TASK-017-004] Create Transaction Filter Schema
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `transactions/filter-schema`
- **File**: `apps/backend/app/schemas/transaction_filters.py`
- **Dependencies**: [TASK-017-003]
```python
class TransactionFilters(BaseModel):
    account_id: Optional[UUID]
    category_id: Optional[int]
    date_from: Optional[date]
    date_to: Optional[date]
    amount_min: Optional[Decimal]
    amount_max: Optional[Decimal]
    search: Optional[str]
```
**Acceptance Criteria**:
- [ ] All filter fields
- [ ] Validation rules
- [ ] Sort options
- [ ] Pagination params

---

##### [TASK-017-005] Create Transaction API Endpoints
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `transactions/endpoints`
- **File**: `apps/backend/app/api/v1/endpoints/transactions.py`
- **Dependencies**: [TASK-017-002]
```python
@router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    service: ITransactionService = Depends()
):
    return await service.create_transaction(str(current_user.id), data)

@router.get("/transactions", response_model=Page[TransactionResponse])
async def list_transactions(
    filters: TransactionFilters = Query(),
    current_user: User = Depends(get_current_user),
    service: ITransactionService = Depends()
):
    return await service.get_transactions(str(current_user.id), filters)
```
**Acceptance Criteria**:
- [ ] POST endpoint
- [ ] GET list endpoint
- [ ] GET detail endpoint
- [ ] PUT update endpoint
- [ ] DELETE endpoint

---

##### [TASK-017-006] Create Transaction Search Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `transactions/search`
- **File**: `apps/backend/app/services/transaction_search.py`
- **Dependencies**: [TASK-017-002]
```python
class TransactionSearchService:
    async def search(
        self, user_id: str, query: str, limit: int = 20
    ) -> List[Transaction]:
        # Full-text search on description
        # Merchant name search
        # Amount search
        # Fuzzy matching
        pass
```
**Acceptance Criteria**:
- [ ] Text search
- [ ] Fuzzy matching
- [ ] Relevance ranking
- [ ] Performance optimization

---

##### [TASK-017-007] Create Pagination Service
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `transactions/pagination`
- **File**: `apps/backend/app/services/pagination.py`
- **Dependencies**: None
```python
class PaginationService:
    def paginate(
        self, 
        query: Select,
        page: int = 1,
        per_page: int = 20
    ) -> Page:
        # Calculate offset
        # Get total count
        # Execute query
        # Return page object
        pass
```
**Acceptance Criteria**:
- [ ] Offset calculation
- [ ] Total count
- [ ] Page metadata
- [ ] Cursor support

---

##### [TASK-017-008] Create Bulk Operations Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `transactions/bulk-ops`
- **File**: `apps/backend/app/services/transaction_bulk.py`
- **Dependencies**: [TASK-017-002]
```python
class TransactionBulkService:
    async def bulk_create(
        self, user_id: str, transactions: List[TransactionCreate]
    ) -> List[Transaction]:
        # Validate all
        # Bulk insert
        # Update balances
        pass
    
    async def bulk_update(
        self, user_id: str, updates: Dict[UUID, TransactionUpdate]
    ):
        # Validate ownership
        # Bulk update
        pass
```
**Acceptance Criteria**:
- [ ] Bulk create
- [ ] Bulk update
- [ ] Bulk delete
- [ ] Transaction support

---

##### [TASK-017-009] Create Transaction Validation Service
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `transactions/validation`
- **File**: `apps/backend/app/services/transaction_validation.py`
- **Dependencies**: [TASK-017-002]
```python
class TransactionValidationService:
    async def validate_transaction(
        self, user_id: str, data: TransactionCreate
    ):
        # Check account ownership
        # Validate amount
        # Check date constraints
        # Business rules
        pass
```
**Acceptance Criteria**:
- [ ] Ownership check
- [ ] Amount validation
- [ ] Date validation
- [ ] Custom rules

---

##### [TASK-017-010] Create Transaction List Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `transactions/list-component`
- **File**: `apps/web/src/features/transactions/components/TransactionList.tsx`
- **Dependencies**: None
```typescript
export const TransactionList: React.FC = () => {
  const transactions = useSelector(selectTransactions)
  const loading = useSelector(selectLoading)
  
  return (
    <List>
      {transactions.map(tx => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </List>
  )
}
```
**Acceptance Criteria**:
- [ ] List rendering
- [ ] Loading state
- [ ] Empty state
- [ ] Infinite scroll

---

##### [TASK-017-011] Create Transaction Item Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/item-component`
- **File**: `apps/web/src/features/transactions/components/TransactionItem.tsx`
- **Dependencies**: None
```typescript
export const TransactionItem: React.FC<{transaction: Transaction}> = ({ transaction }) => {
  return (
    <ListItem>
      <ListItemText 
        primary={transaction.description}
        secondary={formatDate(transaction.date)}
      />
      <Typography>{formatCurrency(transaction.amount)}</Typography>
    </ListItem>
  )
}
```
**Acceptance Criteria**:
- [ ] Display fields
- [ ] Click handler
- [ ] Category badge
- [ ] Amount formatting

---

##### [TASK-017-012] Create Transaction Detail Modal
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `transactions/detail-modal`
- **File**: `apps/web/src/features/transactions/components/TransactionDetail.tsx`
- **Dependencies**: [TASK-017-011]
```typescript
export const TransactionDetail: React.FC<{transaction: Transaction}> = ({ transaction }) => {
  const [editing, setEditing] = useState(false)
  
  return (
    <Dialog open={open} onClose={onClose}>
      {editing ? (
        <TransactionEditForm transaction={transaction} />
      ) : (
        <TransactionView transaction={transaction} />
      )}
    </Dialog>
  )
}
```
**Acceptance Criteria**:
- [ ] View mode
- [ ] Edit mode
- [ ] Delete action
- [ ] Save handling

---

##### [TASK-017-013] Create Transaction Form Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `transactions/form-component`
- **File**: `apps/web/src/features/transactions/components/TransactionForm.tsx`
- **Dependencies**: None
```typescript
export const TransactionForm: React.FC = () => {
  const [form, setForm] = useState<TransactionCreate>({
    amount: '',
    description: '',
    date: new Date(),
    categoryId: null
  })
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```
**Acceptance Criteria**:
- [ ] All fields
- [ ] Validation
- [ ] Category selector
- [ ] Date picker

---

##### [TASK-017-014] Create Quick Add Button
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/quick-add`
- **File**: `apps/web/src/features/transactions/components/QuickAdd.tsx`
- **Dependencies**: [TASK-017-013]
```typescript
export const QuickAddButton: React.FC = () => {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <Fab onClick={() => setOpen(true)}>
        <AddIcon />
      </Fab>
      <QuickAddDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```
**Acceptance Criteria**:
- [ ] FAB button
- [ ] Quick form
- [ ] Keyboard shortcuts
- [ ] Success feedback

---

##### [TASK-017-015] Create Transaction Filters Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `transactions/filters`
- **File**: `apps/web/src/features/transactions/components/TransactionFilters.tsx`
- **Dependencies**: None
```typescript
export const TransactionFilters: React.FC = () => {
  const [filters, setFilters] = useState<TransactionFilters>({})
  
  return (
    <Paper>
      <DateRangePicker />
      <CategoryFilter />
      <AmountRangeFilter />
      <AccountFilter />
    </Paper>
  )
}
```
**Acceptance Criteria**:
- [ ] Date range
- [ ] Category filter
- [ ] Amount range
- [ ] Clear filters

---

##### [TASK-017-016] Create Transaction Search Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/search-component`
- **File**: `apps/web/src/features/transactions/components/TransactionSearch.tsx`
- **Dependencies**: None
```typescript
export const TransactionSearch: React.FC = () => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  
  return (
    <TextField
      placeholder="Search transactions..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      InputProps={{
        startAdornment: <SearchIcon />
      }}
    />
  )
}
```
**Acceptance Criteria**:
- [ ] Search input
- [ ] Debouncing
- [ ] Clear button
- [ ] Results count

---

##### [TASK-017-017] Create Transaction Store Slice
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `transactions/store`
- **File**: `apps/web/src/store/transactions.ts`
- **Dependencies**: None
```typescript
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    filters: {},
    pagination: { page: 1, total: 0 },
    loading: false
  },
  reducers: {
    setTransactions: (state, action) => {
      state.items = action.payload
    },
    setFilters: (state, action) => {
      state.filters = action.payload
    }
  }
})
```
**Acceptance Criteria**:
- [ ] State structure
- [ ] CRUD actions
- [ ] Filter actions
- [ ] Pagination state

---

##### [TASK-017-018] Create Transaction API Client
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/api-client`
- **File**: `apps/web/src/services/transactions.ts`
- **Dependencies**: [TASK-017-017]
```typescript
export const transactionsAPI = {
  create: async (data: TransactionCreate) => {
    return api.post('/transactions', data)
  },
  list: async (filters: TransactionFilters) => {
    return api.get('/transactions', { params: filters })
  },
  update: async (id: string, data: TransactionUpdate) => {
    return api.put(`/transactions/${id}`, data)
  }
}
```
**Acceptance Criteria**:
- [ ] CRUD methods
- [ ] Filter support
- [ ] Error handling
- [ ] Type safety

---

##### [TASK-017-019] Create Infinite Scroll Hook
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/infinite-scroll`
- **File**: `apps/web/src/hooks/useInfiniteScroll.ts`
- **Dependencies**: None
```typescript
export const useInfiniteScroll = (callback: () => void) => {
  const observer = useRef<IntersectionObserver>()
  const lastElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        callback()
      }
    })
    if (node) observer.current.observe(node)
  }, [callback])
  
  return lastElementRef
}
```
**Acceptance Criteria**:
- [ ] Observer setup
- [ ] Threshold config
- [ ] Loading state
- [ ] Cleanup

---

##### [TASK-017-020] Create Transaction Export Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `transactions/export`
- **File**: `apps/web/src/features/transactions/components/ExportButton.tsx`
- **Dependencies**: None
```typescript
export const ExportButton: React.FC = () => {
  const handleExport = async (format: 'csv' | 'pdf') => {
    // Call export API
    // Download file
  }
  
  return (
    <Button onClick={() => handleExport('csv')}>
      Export to CSV
    </Button>
  )
}
```
**Acceptance Criteria**:
- [ ] Export formats
- [ ] Date range
- [ ] Progress indicator
- [ ] Download handling

---

##### [TASK-017-021 through TASK-017-049]
*[Additional 28 transaction management micro-tasks including tests, bulk operations, reconciliation, etc.]*

---

### [STORY-008] Categorization System (13 points → 49 tasks)

#### Phase 4.2: Smart Categorization

##### [TASK-020-001] Create Categorization Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `categorization/service-interface`
- **File**: `apps/backend/app/services/interfaces/categorization.py`
- **Dependencies**: None
```python
class ICategorizationService(ABC):
    @abstractmethod
    async def categorize_transaction(
        self, transaction: Transaction
    ) -> Category:
        pass
    
    @abstractmethod
    async def learn_from_feedback(
        self, transaction_id: UUID, category_id: int
    ):
        pass
```
**Acceptance Criteria**:
- [ ] Categorize method
- [ ] Learning method
- [ ] Bulk categorization
- [ ] Rules management

---

##### [TASK-020-002] Create Rule-Based Categorization
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `categorization/rule-based`
- **File**: `apps/backend/app/services/categorization/rules.py`
- **Dependencies**: [TASK-020-001]
```python
class RuleBasedCategorization(ICategorizationService):
    def __init__(self):
        self.rules = self.load_rules()
        
    async def categorize_transaction(
        self, transaction: Transaction
    ) -> Category:
        # Apply regex rules
        # Check merchant mapping
        # Return best match
        pass
```
**Acceptance Criteria**:
- [ ] Regex patterns
- [ ] Merchant mapping
- [ ] Confidence scoring
- [ ] Default category

---

##### [TASK-020-003] Create Category Rules Configuration
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `categorization/rules-config`
- **File**: `apps/backend/app/core/categorization_rules.py`
- **Dependencies**: None
```python
CATEGORIZATION_RULES = [
    {
        "pattern": r"CARREFOUR|ESSELUNGA|CONAD|LIDL",
        "category": "Groceries",
        "confidence": 0.95
    },
    {
        "pattern": r"NETFLIX|SPOTIFY|AMAZON PRIME",
        "category": "Entertainment",
        "confidence": 0.98
    },
    # More rules...
]
```
**Acceptance Criteria**:
- [ ] Italian merchants
- [ ] EU merchants
- [ ] Confidence levels
- [ ] Priority ordering

---

##### [TASK-020-004] Create Merchant Database
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `categorization/merchant-db`
- **File**: `apps/backend/app/models/merchant.py`
- **Dependencies**: Database from Milestone 2
```python
class Merchant(BaseModel):
    __tablename__ = "merchants"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    patterns = Column(JSON)  # Alternative names/patterns
```
**Acceptance Criteria**:
- [ ] Merchant model
- [ ] Pattern storage
- [ ] Category mapping
- [ ] Update tracking

---

##### [TASK-020-005] Create Learning Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `categorization/learning`
- **File**: `apps/backend/app/services/categorization/learning.py`
- **Dependencies**: [TASK-020-001]
```python
class CategorizationLearningService:
    async def learn_from_feedback(
        self, user_id: str, transaction_id: UUID, category_id: int
    ):
        # Store user preference
        # Update merchant mapping
        # Adjust confidence
        # Cache for future
        pass
```
**Acceptance Criteria**:
- [ ] Preference storage
- [ ] Pattern learning
- [ ] User-specific rules
- [ ] Confidence adjustment

---

##### [TASK-020-006] Create User Preference Model
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `categorization/preferences`
- **File**: `apps/backend/app/models/user_categorization.py`
- **Dependencies**: [TASK-020-004]
```python
class UserCategorizationPreference(BaseModel):
    __tablename__ = "user_categorization_preferences"
    
    user_id = Column(UUID, ForeignKey("users.id"))
    merchant_pattern = Column(String(255))
    category_id = Column(Integer, ForeignKey("categories.id"))
    confidence = Column(Float, default=1.0)
```
**Acceptance Criteria**:
- [ ] User preferences
- [ ] Pattern storage
- [ ] Confidence tracking
- [ ] Usage count

---

##### [TASK-020-007] Create Bulk Categorization Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `categorization/bulk`
- **File**: `apps/backend/app/services/categorization/bulk.py`
- **Dependencies**: [TASK-020-002]
```python
class BulkCategorizationService:
    async def categorize_batch(
        self, transactions: List[Transaction]
    ) -> Dict[UUID, Category]:
        # Batch process
        # Optimize queries
        # Return mapping
        pass
```
**Acceptance Criteria**:
- [ ] Batch processing
- [ ] Performance optimization
- [ ] Progress tracking
- [ ] Error handling

---

##### [TASK-020-008] Create Categorization API Endpoint
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `categorization/endpoint`
- **File**: `apps/backend/app/api/v1/endpoints/categorization.py`
- **Dependencies**: [TASK-020-002]
```python
@router.post("/transactions/{id}/categorize")
async def categorize_transaction(
    id: UUID,
    category_id: int = Body(),
    current_user: User = Depends(get_current_user),
    service: ICategorizationService = Depends()
):
    await service.learn_from_feedback(id, category_id)
    return {"status": "updated"}
```
**Acceptance Criteria**:
- [ ] Manual categorization
- [ ] Learning trigger
- [ ] Bulk endpoint
- [ ] Suggestions endpoint

---

##### [TASK-020-009] Create Category Management Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `categorization/category-mgmt`
- **File**: `apps/backend/app/services/category.py`
- **Dependencies**: None
```python
class CategoryService:
    async def create_custom_category(
        self, user_id: str, data: CategoryCreate
    ) -> Category:
        # Create category
        # Set icon/color
        pass
    
    async def merge_categories(
        self, user_id: str, source_id: int, target_id: int
    ):
        # Update transactions
        # Delete source
        pass
```
**Acceptance Criteria**:
- [ ] CRUD operations
- [ ] Custom categories
- [ ] Merge support
- [ ] Usage stats

---

##### [TASK-020-010] Create Category Selector Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `categorization/selector`
- **File**: `apps/web/src/features/categories/components/CategorySelector.tsx`
- **Dependencies**: None
```typescript
export const CategorySelector: React.FC<{
  value: number,
  onChange: (id: number) => void
}> = ({ value, onChange }) => {
  const categories = useSelector(selectCategories)
  
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {categories.map(cat => (
        <MenuItem key={cat.id} value={cat.id}>
          <span>{cat.icon}</span> {cat.name}
        </MenuItem>
      ))}
    </Select>
  )
}
```
**Acceptance Criteria**:
- [ ] Category list
- [ ] Icon display
- [ ] Search filter
- [ ] Create new option

---

##### [TASK-020-011] Create Category Badge Component
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `categorization/badge`
- **File**: `apps/web/src/features/categories/components/CategoryBadge.tsx`
- **Dependencies**: None
```typescript
export const CategoryBadge: React.FC<{category: Category}> = ({ category }) => {
  return (
    <Chip
      icon={<span>{category.icon}</span>}
      label={category.name}
      style={{ backgroundColor: category.color }}
      size="small"
    />
  )
}
```
**Acceptance Criteria**:
- [ ] Icon display
- [ ] Color styling
- [ ] Click handler
- [ ] Tooltip

---

##### [TASK-020-012] Create Recategorization Dialog
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `categorization/recategorize`
- **File**: `apps/web/src/features/categories/components/RecategorizeDialog.tsx`
- **Dependencies**: [TASK-020-010]
```typescript
export const RecategorizeDialog: React.FC<{
  transaction: Transaction,
  open: boolean,
  onClose: () => void
}> = ({ transaction, open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Change Category</DialogTitle>
      <DialogContent>
        <CategorySelector 
          value={transaction.categoryId}
          onChange={handleCategoryChange}
        />
        <FormControlLabel
          control={<Checkbox />}
          label="Apply to all similar transactions"
        />
      </DialogContent>
    </Dialog>
  )
}
```
**Acceptance Criteria**:
- [ ] Category selection
- [ ] Bulk apply option
- [ ] Confirmation
- [ ] Learning trigger

---

##### [TASK-020-013 through TASK-020-049]
*[Additional 36 categorization micro-tasks including ML preparation, testing, analytics, etc.]*

---

## [EPIC-005] Import/Export Features (13 points → 47 tasks)

### [STORY-009] CSV Import/Export (7 points → 25 tasks)

*[Tasks for CSV parsing, validation, mapping, export formatting...]*

### [STORY-010] Bank Statement Import (6 points → 22 tasks)

*[Tasks for PDF parsing, OCR, reconciliation...]*

---

## Summary Statistics for Milestone 4

```yaml
Total Micro-Tasks: 145
Parallel Execution Paths: 6
Estimated Completion: Week 5 (6-8 days with 4 agents)

Critical Path:
1. Transaction service (TASK-017-001 to 017-005)
2. Categorization rules (TASK-020-001 to 020-003)
3. UI components (TASK-017-010 to 017-013)
4. Search and filters (TASK-017-006, 017-015)

Agent Assignment:
- Claude-Backend: 75 tasks (services, categorization, import/export)
- Claude-Frontend: 45 tasks (UI components, forms, selectors)
- Copilot: 20 tasks (testing, documentation)
- Claude-Data: 5 tasks (CSV parsing, data mapping)

Branch Strategy:
- transactions/* - Core transaction management
- categorization/* - Smart categorization system
- import-export/* - Data import/export features
```
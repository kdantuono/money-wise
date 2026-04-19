# Milestone 5: Financial Intelligence & Dashboard - Detailed Breakdown
## 45 Points → 168 Micro-Tasks

---

## Quick Reference for Claude Code

```yaml
Total Tasks: 168
Parallel Branches: 8
Estimated Time: Week 6
Critical Path: TASK-022 (analytics API) → TASK-023 (dashboard UI) → TASK-024 (real-time)
Dependencies: Milestones 1-4 complete, especially transaction data
```

---

## [EPIC-005] Dashboard & Analytics (29 points → 108 tasks)

### [STORY-009] Dashboard Implementation (21 points → 78 tasks)

#### Phase 5.1: Analytics Backend

##### [TASK-022-001] Create Analytics Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `analytics/service-interface`
- **File**: `apps/backend/app/services/interfaces/analytics.py`
- **Dependencies**: Transaction service from Milestone 4
```python
class IAnalyticsService(ABC):
    @abstractmethod
    async def get_cash_flow(
        self, user_id: str, start_date: date, end_date: date
    ) -> CashFlowData:
        pass
    
    @abstractmethod
    async def get_spending_by_category(
        self, user_id: str, period: str
    ) -> Dict[str, Decimal]:
        pass
```
**Acceptance Criteria**:
- [ ] Cash flow methods
- [ ] Category analytics
- [ ] Trend analysis
- [ ] Comparison methods

---

##### [TASK-022-002] Implement Analytics Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/service-impl`
- **File**: `apps/backend/app/services/analytics.py`
- **Dependencies**: [TASK-022-001]
```python
class AnalyticsService(IAnalyticsService):
    async def get_cash_flow(
        self, user_id: str, start_date: date, end_date: date
    ) -> CashFlowData:
        # Query income transactions
        # Query expense transactions
        # Calculate daily/weekly/monthly flow
        # Return structured data
        pass
```
**Acceptance Criteria**:
- [ ] Income calculation
- [ ] Expense calculation
- [ ] Net flow
- [ ] Time grouping

---

##### [TASK-022-003] Create Cash Flow Calculator
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/cash-flow`
- **File**: `apps/backend/app/services/analytics/cash_flow.py`
- **Dependencies**: [TASK-022-002]
```python
class CashFlowCalculator:
    async def calculate_daily_flow(
        self, transactions: List[Transaction]
    ) -> List[DailyFlow]:
        # Group by day
        # Sum income/expense
        # Calculate running balance
        pass
    
    async def project_future_flow(
        self, historical_data: List[DailyFlow]
    ) -> List[DailyFlow]:
        # Analyze patterns
        # Project future
        pass
```
**Acceptance Criteria**:
- [ ] Daily grouping
- [ ] Running balance
- [ ] Projection logic
- [ ] Recurring detection

---

##### [TASK-022-004] Create Category Analytics Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/categories`
- **File**: `apps/backend/app/services/analytics/category_analytics.py`
- **Dependencies**: [TASK-022-002]
```python
class CategoryAnalytics:
    async def get_spending_breakdown(
        self, user_id: str, month: date
    ) -> CategoryBreakdown:
        # Query by category
        # Calculate percentages
        # Compare to previous month
        # Identify trends
        pass
```
**Acceptance Criteria**:
- [ ] Category totals
- [ ] Percentage calculation
- [ ] Month comparison
- [ ] Trend detection

---

##### [TASK-022-005] Create Time Series Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/time-series`
- **File**: `apps/backend/app/services/analytics/time_series.py`
- **Dependencies**: [TASK-022-002]
```python
class TimeSeriesAnalytics:
    async def get_spending_trend(
        self, user_id: str, periods: int = 12
    ) -> List[MonthlyTrend]:
        # Get monthly totals
        # Calculate moving average
        # Identify outliers
        # Return trend data
        pass
```
**Acceptance Criteria**:
- [ ] Monthly aggregation
- [ ] Moving averages
- [ ] Trend calculation
- [ ] Seasonality detection

---

##### [TASK-022-006] Create Top Merchants Service
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `analytics/merchants`
- **File**: `apps/backend/app/services/analytics/merchants.py`
- **Dependencies**: [TASK-022-002]
```python
class MerchantAnalytics:
    async def get_top_merchants(
        self, user_id: str, limit: int = 10
    ) -> List[MerchantSpending]:
        # Aggregate by merchant
        # Sort by total
        # Include frequency
        pass
```
**Acceptance Criteria**:
- [ ] Merchant grouping
- [ ] Spending totals
- [ ] Visit frequency
- [ ] Trend arrows

---

##### [TASK-022-007] Create Budget vs Actual Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/budget-actual`
- **File**: `apps/backend/app/services/analytics/budget_comparison.py`
- **Dependencies**: Budget service from earlier
```python
class BudgetComparisonService:
    async def get_budget_status(
        self, user_id: str, month: date
    ) -> List[BudgetStatus]:
        # Get budgets
        # Calculate actual spending
        # Compare and calculate percentage
        # Determine alert level
        pass
```
**Acceptance Criteria**:
- [ ] Budget retrieval
- [ ] Actual calculation
- [ ] Percentage used
- [ ] Alert thresholds

---

##### [TASK-022-008] Create Insights Generator
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `analytics/insights`
- **File**: `apps/backend/app/services/analytics/insights.py`
- **Dependencies**: [TASK-022-002 through TASK-022-007]
```python
class InsightsGenerator:
    async def generate_insights(
        self, user_id: str
    ) -> List[Insight]:
        insights = []
        
        # Spending spike detection
        # Unusual transactions
        # Saving opportunities
        # Budget recommendations
        # Category changes
        
        return sorted(insights, key=lambda x: x.priority)
```
**Acceptance Criteria**:
- [ ] Multiple insight types
- [ ] Priority scoring
- [ ] Actionable messages
- [ ] Personalization

---

##### [TASK-022-009] Create Analytics Cache Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/cache`
- **File**: `apps/backend/app/services/analytics/cache.py`
- **Dependencies**: Redis setup
```python
class AnalyticsCacheService:
    async def get_or_calculate(
        self, key: str, calculator: Callable, ttl: int = 300
    ):
        # Check cache
        # If miss, calculate
        # Store in cache
        # Return result
        pass
```
**Acceptance Criteria**:
- [ ] Redis integration
- [ ] TTL configuration
- [ ] Invalidation logic
- [ ] Compression

---

##### [TASK-022-010] Create Analytics Aggregation Jobs
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/jobs`
- **File**: `apps/backend/app/jobs/analytics_aggregation.py`
- **Dependencies**: [TASK-022-002]
```python
@celery.task
def aggregate_daily_analytics():
    # Calculate for all users
    # Store in TimescaleDB
    # Update cache
    pass

@celery.task
def generate_monthly_reports():
    # Monthly summaries
    # Email reports
    pass
```
**Acceptance Criteria**:
- [ ] Daily aggregation
- [ ] Monthly rollups
- [ ] Error handling
- [ ] Progress tracking

---

##### [TASK-022-011] Create Dashboard API Endpoints
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `analytics/endpoints`
- **File**: `apps/backend/app/api/v1/endpoints/dashboard.py`
- **Dependencies**: [TASK-022-002]
```python
@router.get("/dashboard/overview")
async def get_dashboard_overview(
    period: str = Query(default="month"),
    current_user: User = Depends(get_current_user),
    service: IAnalyticsService = Depends()
):
    return {
        "cash_flow": await service.get_cash_flow(user_id, start, end),
        "categories": await service.get_spending_by_category(user_id, period),
        "trends": await service.get_trends(user_id),
        "insights": await service.get_insights(user_id)
    }
```
**Acceptance Criteria**:
- [ ] Overview endpoint
- [ ] Individual metrics
- [ ] Period filtering
- [ ] Response caching

---

##### [TASK-022-012] Create Analytics Schemas
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `analytics/schemas`
- **File**: `apps/backend/app/schemas/analytics.py`
- **Dependencies**: None
```python
class CashFlowData(BaseModel):
    income: Decimal
    expenses: Decimal
    net_flow: Decimal
    daily_data: List[DailyFlow]
    
class CategoryBreakdown(BaseModel):
    category: str
    amount: Decimal
    percentage: float
    change_from_last_period: float
```
**Acceptance Criteria**:
- [ ] All response schemas
- [ ] Validation rules
- [ ] Nested structures
- [ ] Documentation

---

##### [TASK-022-013] Create Dashboard Container Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `dashboard/container`
- **File**: `apps/web/src/features/dashboard/components/Dashboard.tsx`
- **Dependencies**: None
```typescript
export const Dashboard: React.FC = () => {
  const { data, loading, error } = useDashboardData()
  
  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorState />
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <CashFlowChart data={data.cashFlow} />
      </Grid>
      <Grid item xs={12} md={6}>
        <CategoryPieChart data={data.categories} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TopMerchants data={data.merchants} />
      </Grid>
      {/* More widgets */}
    </Grid>
  )
}
```
**Acceptance Criteria**:
- [ ] Grid layout
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling

---

##### [TASK-022-014] Create Cash Flow Chart Component
- **Points**: 0.8
- **Agent**: Claude-Frontend
- **Branch**: `dashboard/cash-flow-chart`
- **File**: `apps/web/src/features/dashboard/components/CashFlowChart.tsx`
- **Dependencies**: None
```typescript
export const CashFlowChart: React.FC<{data: CashFlowData}> = ({ data }) => {
  return (
    <Card>
      <CardHeader title="Cash Flow" />
      <CardContent>
        <AreaChart data={data.daily_data}>
          <Area dataKey="income" stroke="#4CAF50" fill="#4CAF50" />
          <Area dataKey="expenses" stroke="#f44336" fill="#f44336" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
        </AreaChart>
      </CardContent>
    </Card>
  )
}
```
**Acceptance Criteria**:
- [ ] Area chart
- [ ] Income/expense layers
- [ ] Interactive tooltip
- [ ] Time range selector

---

##### [TASK-022-015] Create Category Pie Chart Component
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `dashboard/category-chart`
- **File**: `apps/web/src/features/dashboard/components/CategoryPieChart.tsx`
- **Dependencies**: None
```typescript
export const CategoryPieChart: React.FC<{data: CategoryBreakdown[]}> = ({ data }) => {
  return (
    <Card>
      <CardHeader title="Spending by Category" />
      <CardContent>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </CardContent>
    </Card>
  )
}
```
**Acceptance Criteria**:
- [ ] Pie/donut chart
- [ ] Category colors
- [ ] Percentages
- [ ] Click interactions

---

##### [TASK-022-016 through TASK-022-078]
*[Additional 62 dashboard micro-tasks including budget progress, insights widget, real-time updates, testing, etc.]*

### [STORY-010] Budget Management (8 points → 30 tasks)

#### Phase 5.2: Budget Features

##### [TASK-025-001] Create Budget Service Interface
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `budget/service-interface`
- **File**: `apps/backend/app/services/interfaces/budget.py`
- **Dependencies**: Database models
```python
class IBudgetService(ABC):
    @abstractmethod
    async def create_budget(
        self, user_id: str, data: BudgetCreate
    ) -> Budget:
        pass
    
    @abstractmethod
    async def get_budget_status(
        self, user_id: str, month: date
    ) -> List[BudgetStatus]:
        pass
```
**Acceptance Criteria**:
- [ ] CRUD operations
- [ ] Status calculation
- [ ] Alert management
- [ ] Rollover support

---

##### [TASK-025-002 through TASK-025-030]
*[Additional 29 budget management micro-tasks]*

---

## [EPIC-006] Insights & Recommendations (16 points → 60 tasks)

### [STORY-011] Spending Insights (8 points → 30 tasks)

#### Phase 5.3: Intelligent Insights

##### [TASK-026-001] Create Insight Detection Service
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `insights/detection`
- **File**: `apps/backend/app/services/insights/detection.py`
- **Dependencies**: Analytics service
```python
class InsightDetectionService:
    async def detect_spending_spike(
        self, user_id: str, transactions: List[Transaction]
    ) -> Optional[Insight]:
        # Compare current vs average
        # Identify anomalies
        # Generate insight
        pass
```
**Acceptance Criteria**:
- [ ] Anomaly detection
- [ ] Threshold configuration
- [ ] Message generation
- [ ] Priority scoring

---

##### [TASK-026-002 through TASK-026-030]
*[Additional 29 insight generation micro-tasks]*

### [STORY-012] Savings Opportunities (8 points → 30 tasks)

##### [TASK-027-001 through TASK-027-030]
*[30 savings detection and goals tracking micro-tasks]*

---

## Summary Statistics for Milestone 5

```yaml
Total Micro-Tasks: 168
Parallel Execution Paths: 8
Estimated Completion: Week 6 (8-10 days with 4 agents)

Critical Path:
1. Analytics backend (TASK-022-001 to 022-011)
2. Dashboard UI (TASK-022-013 to 022-019)
3. Real-time updates (TASK-022-024)
4. Budget system (TASK-025-001 to 025-003)

Agent Assignment:
- Claude-Backend: 70 tasks (analytics, insights, aggregation)
- Claude-Frontend: 65 tasks (charts, widgets, dashboard)
- Claude-Data: 20 tasks (time series, aggregations)
- Copilot: 13 tasks (testing, documentation)

Branch Strategy:
- analytics/* - Backend analytics services
- dashboard/* - Dashboard UI components
- budget/* - Budget management
- insights/* - Insights generation
```
# Banking Provider Research - Executive Summary
## MoneyWise MVP - Quick Reference Guide

**Research Date**: October 23, 2025
**Full Report**: See `BANKING-PROVIDER-RESEARCH-PHASE4.md` for complete analysis

---

## PRIMARY RECOMMENDATION: GoCardless (Nordigen)

**Confidence Level**: HIGH (90%)

### Why GoCardless?

1. **FREE Tier**: 50 connections/month = €0 cost for MVP phase
2. **Italian Coverage**: ✓ Intesa Sanpaolo, UniCredit, Fineco, MPS, UBI (top 5 confirmed)
3. **Developer Friendly**: Node.js/Python SDKs, sandbox, clear docs
4. **PSD2 Compliant**: Full AISP license, OAuth 2.0, GDPR compliant
5. **Cost Savings**: €15,400-28,700 saved vs. Plaid over 3 years

---

## Quick Comparison Matrix

| Provider | MVP Score | Free Tier | Italian Banks | 3-Year TCO | Best For |
|----------|-----------|-----------|---------------|------------|----------|
| **GoCardless** ⭐ | 8.7/10 | ✅ 50/mo | ✅ Top 5 confirmed | €9,450-18,900 | **MVP & Bootstrap** |
| SaltEdge | 6.8/10 | ❌ No | ✅ 100+ APIs | €17,150-27,500 | ISO 27001 required |
| Plaid | 6.8/10 | ⚠️ 200 calls only | ⚠️ Unclear | €24,850-47,600 | Well-funded teams |
| Tink (Visa) | 6.3/10 | ❌ No | ✅ CBI Globe | €32,900-59,200 | Enterprise |
| TrueLayer | 6.4/10 | ⚠️ Sandbox only | ⚠️ Unclear | €19,200-32,200 | Developer-first |

**Legend**: ⭐ = Recommended | ✅ = Excellent | ⚠️ = Limited | ❌ = Not available

---

## GoCardless Details

### Strengths
- **Cost**: Free for 0-50 users (zero € spent in MVP)
- **Coverage**: 2,300+ European banks, 100+ Italian APIs
- **Integration**: Official SDKs, REST API, OAuth 2.0
- **Timeline**: 2-4 weeks to MVP integration

### Limitations
- **Rate Limits**: 4-10 API calls/day (bank-dependent)
- **SLA**: No public uptime guarantee
- **Risk**: Free tier may be reduced in future (mitigation: abstraction layer)

### Italian Banks Confirmed
✅ Intesa Sanpaolo (90-day transaction history)
✅ UniCredit
✅ Fineco
✅ Monte dei Paschi di Siena
✅ UBI Banca

---

## Cost Savings Breakdown

| Phase | Months | GoCardless | Plaid | Savings |
|-------|--------|------------|-------|---------|
| MVP | 1-3 | €0 | €350 | €350 |
| Growth | 4-12 | €1,050-2,100 | €2,100-5,250 | €1,050-3,150 |
| Scale | 13-36 | €8,400-16,800 | €22,400-42,000 | €14,000-25,200 |
| **3-Year Total** | **36** | **€9,450-18,900** | **€24,850-47,600** | **€15,400-28,700** |

**Result**: 62-152% cost savings with GoCardless vs. Plaid

---

## Risk Management

### Top 3 Risks & Mitigations

**1. Free Tier Removal** (Medium probability, High impact)
- ✅ **Mitigation**: Implement provider abstraction layer (2-4 week migration)
- ✅ Budget €1,200-2,400/year for paid tier in Year 2
- ✅ Monitor usage (alert at 40 connections)

**2. Vendor Lock-In** (Medium probability, High impact)
- ✅ **Mitigation**: Use standard PSD2 interfaces, avoid proprietary features
- ✅ Design abstraction layer from Day 1 (see architecture pattern in full report)
- ✅ Research SaltEdge as backup provider

**3. Rate Limit Constraints** (High probability, Medium impact)
- ✅ **Mitigation**: Set user expectations (2-4 syncs/day)
- ✅ Implement smart caching to reduce API calls
- ✅ Plan upgrade to unlimited provider if needed (SaltEdge/Plaid)

---

## When to Consider Alternatives

### Upgrade to SaltEdge if:
- ISO 27001 certification becomes mandatory
- Need best-in-class Italian coverage (100+ documented APIs)
- Budget allows €17,000+ over 3 years

### Upgrade to Plaid if:
- Secure funding and cost is not primary constraint
- Developer velocity is critical (92% positive dev experience)
- Planning North American expansion

### Upgrade to Tink if:
- Enterprise SLA and Visa-backed infrastructure required
- Need 6,000+ bank connections across Europe
- Budget allows €33,000+ over 3 years

---

## Implementation Roadmap

### Week 1-2: Foundation
- Sign up for GoCardless free tier
- Implement provider abstraction layer
- Setup development environment

### Week 3-4: Integration
- Integrate GoCardless SDK (Node.js)
- Implement authentication flows (OAuth 2.0)
- Develop sync features (accounts, transactions)

### Week 5-6: Testing
- Test with sandbox (SANDBOXFINANCE_SFIN0000)
- Test with 5 real Italian bank accounts
- Validate PSD2 compliance (SCA flows)

### Week 7-8: Launch
- Launch MVP with free tier
- Monitor connection usage
- Collect user feedback

---

## Key Technical Details

### API Architecture
- **Protocol**: RESTful API
- **Authentication**: OAuth 2.0 + JWT
- **Data Format**: JSON (unified across banks)
- **Rate Limits**: 4-10 API calls/day per connection
- **Sync Frequency**: 4 syncs/day (recommended)

### SDKs Available
- ✅ Node.js: https://github.com/nordigen/nordigen-node
- ✅ Python: https://github.com/nordigen/nordigen-python
- ✅ Sandbox: SANDBOXFINANCE_SFIN0000

### Security & Compliance
- ✅ PSD2 AISP License
- ✅ OAuth 2.0 with SCA (Strong Customer Authentication)
- ✅ GDPR Compliant (EU-based)
- ✅ TLS 1.2+ encryption

---

## Decision Framework

```
Is this MVP phase (< 50 users)?
├─ YES → GoCardless ✅ (Free tier = €0 cost)
└─ NO → Continue reading...

Will you have 50-500 users?
├─ Rate limits acceptable (4-10 req/day)? → GoCardless ✅
└─ Need unlimited API calls? → SaltEdge or Plaid

Will you have 500+ users?
├─ Cost optimization priority? → GoCardless ✅ (Best TCO)
└─ Need enterprise SLA? → Plaid or Tink
```

---

## Architecture Pattern (Prevent Lock-In)

```typescript
// Abstraction layer - IMPLEMENT FROM DAY 1
interface IBankingProvider {
  initiateAuth(userId: string): Promise<AuthUrl>;
  listAccounts(token: AccessToken): Promise<BankAccount[]>;
  getTransactions(accountId: string, from: Date, to: Date): Promise<Transaction[]>;
}

// Provider implementations
class GoCardlessProvider implements IBankingProvider { /* ... */ }
class SaltEdgeProvider implements IBankingProvider { /* ... */ }

// Dependency injection allows easy switching
class BankingService {
  constructor(private provider: IBankingProvider) {}
}
```

**Migration Effort**: 2-4 weeks with proper abstraction layer

---

## Success Criteria for MVP

✅ **Cost**: €0 spent in MVP phase (50 connections free)
✅ **Coverage**: Top 5 Italian banks accessible
✅ **Compliance**: PSD2 AISP licensed with SCA
✅ **Integration**: MVP deployed in 4 weeks
✅ **Risk**: Abstraction layer implemented (prevent lock-in)

---

## Next Actions

### Immediate (This Week)
1. ✅ Review this research report
2. ⏭️ Sign up for GoCardless free tier
3. ⏭️ Create developer account and get API credentials
4. ⏭️ Clone Node.js SDK: `git clone https://github.com/nordigen/nordigen-node`

### Week 1-2
5. ⏭️ Design provider abstraction layer (interfaces)
6. ⏭️ Implement GoCardless integration
7. ⏭️ Test with sandbox environment

### Week 3-4
8. ⏭️ Test with real Italian bank accounts
9. ⏭️ Deploy MVP with free tier
10. ⏭️ Monitor connection usage (alert at 40)

---

## Contact & Support

**GoCardless (Nordigen)**
- Website: https://gocardless.com/bank-account-data
- Docs: https://nordigen.com/en/account_information_documenation/
- GitHub: https://github.com/nordigen
- Support: Via GoCardless portal

**Research Questions?**
- Full analysis: `docs/planning/BANKING-PROVIDER-RESEARCH-PHASE4.md`
- 43 evidence sources cited
- 6-dimensional comparative matrix
- 3-year TCO calculations
- Risk assessment with mitigations

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **Providers Analyzed** | 5 (GoCardless, SaltEdge, Plaid, Tink, TrueLayer) |
| **Evidence Sources** | 43 (official docs, regulatory, industry) |
| **Cost Savings vs Plaid** | €15,400-28,700 over 3 years |
| **MVP Integration Time** | 2-4 weeks |
| **Free Tier Limit** | 50 connections/month |
| **Italian Banks Confirmed** | Top 5 (Intesa, UniCredit, Fineco, MPS, UBI) |
| **PSD2 Compliance** | ✅ Full AISP license |
| **Recommendation Confidence** | HIGH (90%) |

---

**Document Version**: 1.0 (October 23, 2025)
**Research Methodology**: Evidence-based, official sources only
**Decision Confidence**: HIGH for MVP recommendation

---

## TL;DR

**Use GoCardless (Nordigen) for MoneyWise MVP**
- Free tier (50 connections) = €0 cost
- Top 5 Italian banks confirmed
- Save €15,400-28,700 vs. Plaid over 3 years
- 2-4 week integration timeline
- Design abstraction layer to prevent lock-in

**Start today**: Sign up at https://gocardless.com/bank-account-data


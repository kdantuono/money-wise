# Known Security Issues
**Last Updated**: 2025-10-31
**Maintenance**: Update this document when security issues are discovered or resolved

---

## Active Issues

### CVE-2024-29415: ip Package SSRF Vulnerability

**Status**: NO FIX AVAILABLE (as of 2025-10-31)
**Severity**: HIGH (CVSS 8.1)
**Dependabot Alert**: [#14](https://github.com/kdantuono/money-wise/security/dependabot/14)

#### Details
- **Package**: `ip` <= 2.0.1
- **Vulnerability**: Server-Side Request Forgery (SSRF) - Improper categorization in `isPublic()`
- **Affected Versions**: All versions up to and including 2.0.1
- **CVE**: CVE-2024-29415
- **GHSA**: GHSA-2p57-rm9w-gvfp

#### Description
The ip package improperly categorizes certain IP addresses (such as `127.1`, `01200034567`, `012.1.2.3`, `000:0:0000::01`, and `::fFFf:127.0.0.1`) as globally routable via the `isPublic()` function. This is an incomplete fix for CVE-2023-42282.

#### Our Exposure
- **Source**: Transitive dependency via `react-native@0.72.6` (mobile app only)
- **Direct Usage**: The `ip` package is NOT directly imported or used in our production code
- **Risk Assessment**: **LOW**
  - The package is pulled in as a transitive dependency
  - Our codebase does not call `ip.isPublic()` directly
  - Mobile app is the only affected scope

#### Mitigation Strategy

**Current**:
1. ✅ Verified package is not directly used in production code
2. ✅ Monitoring upstream repositories for fix:
   - [ip package issue #150](https://github.com/indutny/node-ip/issues/150)
   - [React Native dependency tree](https://github.com/facebook/react-native)
3. ✅ Added to security monitoring checklist

**Future Actions**:
- **Short-term**: Update react-native when a version is released that doesn't depend on vulnerable `ip` package
- **Long-term**: Consider alternative packages if `ip` package remains unmaintained
  - Candidate: `@achingbrain/ip` (maintained fork)
  - Requires testing for compatibility

#### Developer Guidelines
If you need IP address validation in new code:
1. **DO NOT** use the `ip` package directly
2. **USE** built-in Node.js `net.isIP()` for basic validation
3. **USE** custom validation logic for public/private determination:
   ```typescript
   import { isIP } from 'net';

   function isPrivateIP(ip: string): boolean {
     // Implement RFC1918 + RFC4193 validation
     // See: docs/examples/ip-validation.ts
   }
   ```

#### References
- [NVD CVE-2024-29415](https://nvd.nist.gov/vuln/detail/CVE-2024-29415)
- [GitHub Advisory GHSA-2p57-rm9w-gvfp](https://github.com/advisories/GHSA-2p57-rm9w-gvfp)
- [NetApp Advisory NTAP-20250117-0010](https://security.netapp.com/advisory/ntap-20250117-0010)

---

## Recently Resolved Issues

### Alert #43: vite - server.fs.deny Bypass (RESOLVED 2025-10-31)
- **Fixed In**: vite@5.4.21
- **Resolution**: Updated via `vitest` dependency

### Alert #44: validator - URL Validation Bypass (RESOLVED 2025-10-31)
- **Fixed In**: validator@13.15.20
- **Resolution**: Updated via `class-validator` dependency

### Alerts #41, #37, #36: axios Vulnerabilities (RESOLVED 2025-10-31)
- **Fixed In**: axios@1.12.0
- **Vulnerabilities**:
  - DoS via data size check bypass (HIGH)
  - SSRF and credential leakage (HIGH)
  - CSRF vulnerability (MEDIUM)
- **Resolution**: Already using axios ^1.12.0

---

## Security Monitoring Checklist

**Weekly** (Automated via Dependabot):
- [ ] Review new Dependabot alerts
- [ ] Check for available fixes
- [ ] Update dependencies with patches

**Monthly** (Manual Review):
- [ ] Review this document for outdated information
- [ ] Check upstream issues for progress on unfixed vulnerabilities
- [ ] Verify mitigation strategies are still effective
- [ ] Update developer guidelines if needed

**Before Each Release**:
- [ ] Verify no HIGH severity vulnerabilities with available fixes
- [ ] Document any accepted risks in release notes
- [ ] Update security documentation

---

## Reporting Security Issues

**Internal Team**: Create a GitHub issue with label `security`

**External Researchers**: Email security@[domain].com (when established)

**Sensitive Issues**: Use GitHub Security Advisories for responsible disclosure

---

## Related Documentation

- [Dependabot Security Report](./SECURITY-DEPENDABOT-REPORT.md)
- [Dependabot Configuration](../.github/dependabot.yml)
- [Security Policy](../SECURITY.md) (to be created)

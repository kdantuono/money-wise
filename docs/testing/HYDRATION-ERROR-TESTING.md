# Hydration Error Testing Guide

## Purpose
Verify that React hydration mismatches caused by browser password managers are completely resolved.

## Pre-Test Setup

### 1. Clear Browser Cache & Extensions
```bash
# Chrome/Edge
- Open DevTools (F12)
- Right-click refresh → "Empty Cache and Hard Reload"

# Firefox
- Ctrl+Shift+Delete → Select "Cache" → Clear
```

### 2. Ensure Password Managers Are Active
Test with at least one of these enabled:
- Dashlane
- LastPass
- 1Password
- Bitwarden
- Chrome built-in password manager
- Firefox Lockwise

### 3. Start Fresh Dev Server
```bash
cd /home/nemesi/dev/money-wise

# Clear cache
rm -rf apps/web/.next

# Start services
docker compose -f docker-compose.dev.yml up web -d

# Or local dev:
cd apps/web && pnpm dev
```

### 4. Open Browser Console
- Chrome/Edge/Firefox: F12 → Console tab
- Clear console before testing
- Enable "Preserve log" to catch errors during navigation

## Test Cases

### Test 1: Login Page - Fresh Load
**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Wait for page to fully load
3. Check console for errors

**Expected Results:**
- ✅ No hydration errors
- ✅ No "Warning: Extra attributes from the server" errors
- ✅ No "Warning: Did not expect server HTML to contain" errors
- ✅ Loading skeleton appears briefly (~50ms)
- ✅ Form fades in smoothly
- ✅ No layout shift (CLS = 0)

**Console Check:**
```javascript
// Should see ZERO errors like this:
❌ Error: Hydration failed because the server rendered HTML didn't match the client
❌ Warning: Extra attributes from the server: data-dashlanecreated
❌ Warning: Did not expect server HTML to contain a <span> in <input>
```

### Test 2: Login Page - With Auto-fill
**Steps:**
1. Clear console
2. Navigate to `http://localhost:3000/auth/login`
3. Wait for password manager to inject credentials
4. Observe console during auto-fill

**Expected Results:**
- ✅ No hydration errors during auto-fill
- ✅ Email field populated correctly
- ✅ Password field populated correctly
- ✅ Password manager icon appears in inputs
- ✅ Form remains functional

### Test 3: Login Page - Form Submission
**Steps:**
1. Enter credentials (use auto-fill or manual)
2. Click "Sign In" button
3. Observe console during submission

**Expected Results:**
- ✅ No errors during submission
- ✅ Form validation works
- ✅ Loading state appears
- ✅ Network request sent correctly

### Test 4: Register Page - Fresh Load
**Steps:**
1. Clear console
2. Navigate to `http://localhost:3000/auth/register`
3. Wait for page to fully load

**Expected Results:**
- ✅ No hydration errors
- ✅ Loading skeleton matches 5-field layout
- ✅ All fields render correctly
- ✅ Password visibility toggles work

### Test 5: Register Page - With Auto-fill
**Steps:**
1. Clear console
2. Navigate to register page
3. Start filling first name
4. Allow password manager to suggest/fill fields

**Expected Results:**
- ✅ Auto-fill suggestions appear
- ✅ No hydration errors
- ✅ Fields populate correctly
- ✅ Form validation works

### Test 6: Register Page - Form Submission
**Steps:**
1. Fill all fields (first name, last name, email, password, confirm password)
2. Click "Create Account"
3. Observe console

**Expected Results:**
- ✅ No errors during submission
- ✅ Validation works (password match, email format, etc.)
- ✅ Loading state appears
- ✅ Network request sent

### Test 7: Password Visibility Toggle
**Steps:**
1. Navigate to login page
2. Enter password (or use auto-fill)
3. Click "Show" button
4. Click "Hide" button
5. Repeat on register page (password + confirm password)

**Expected Results:**
- ✅ Toggle works instantly
- ✅ No hydration errors
- ✅ Password text visible/hidden correctly
- ✅ No console warnings

### Test 8: Form Validation
**Login Page:**
1. Submit empty form
2. Submit invalid email
3. Submit empty password

**Register Page:**
1. Submit empty form
2. Submit mismatched passwords
3. Submit password < 8 characters
4. Submit invalid email

**Expected Results:**
- ✅ Error messages display correctly
- ✅ Error styling applied (red border)
- ✅ No hydration errors
- ✅ Form remains interactive

### Test 9: Navigation Between Pages
**Steps:**
1. Start at `/auth/login`
2. Click "Sign up" link → `/auth/register`
3. Click "Sign in" link → `/auth/login`
4. Repeat 3 times

**Expected Results:**
- ✅ No hydration errors during navigation
- ✅ Loading skeletons appear on each load
- ✅ Forms render correctly every time
- ✅ Auto-fill still works after navigation

### Test 10: Hard Refresh
**Steps:**
1. Navigate to login page
2. Press Ctrl+Shift+R (hard refresh)
3. Check console
4. Repeat on register page

**Expected Results:**
- ✅ No hydration errors after hard refresh
- ✅ Cache cleared successfully
- ✅ Forms work correctly

## Cross-Browser Testing

### Chrome/Edge (Chromium)
- [ ] Test 1-10 passed
- [ ] Chrome built-in password manager tested
- [ ] DevTools console clean

### Firefox
- [ ] Test 1-10 passed
- [ ] Firefox Lockwise tested
- [ ] Browser console clean

### Safari (if available)
- [ ] Test 1-10 passed
- [ ] iCloud Keychain tested
- [ ] Web Inspector clean

## Performance Testing

### Core Web Vitals Check
```javascript
// Run in browser console after page load
performance.getEntriesByType('navigation')[0].toJSON()

// Check these metrics:
// - domContentLoadedEventEnd < 2000ms
// - loadEventEnd < 3000ms

// For CLS (Cumulative Layout Shift):
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('CLS:', entry.value) // Should be < 0.1
  }
}).observe({type: 'layout-shift', buffered: true})
```

**Expected Results:**
- ✅ CLS (Cumulative Layout Shift) < 0.1
- ✅ No layout jumps when skeleton → form transition
- ✅ Form appears within 100ms of page load

## Debugging Failed Tests

### If Hydration Errors Still Occur

**1. Check Browser Console:**
```javascript
// Look for these specific errors:
- "Hydration failed"
- "Extra attributes from the server"
- "Did not expect server HTML to contain"
- "Text content does not match"
```

**2. Inspect DOM:**
```javascript
// Check if ClientOnly is working:
document.querySelector('form').parentElement.dataset

// Should see mounting behavior:
// 1st check: form should not exist immediately
// 2nd check: form appears after ~50ms
```

**3. Verify ClientOnly Component:**
```bash
# Check component exists
cat apps/web/src/components/client-only.tsx

# Check imports in auth pages
grep -n "ClientOnly" apps/web/app/auth/login/page.tsx
grep -n "ClientOnly" apps/web/app/auth/register/page.tsx
```

**4. Check for Missing `'use client'` Directive:**
```bash
# Verify both pages have 'use client'
head -n 1 apps/web/app/auth/login/page.tsx
head -n 1 apps/web/app/auth/register/page.tsx

# Both should output: 'use client'
```

**5. Clear All Caches:**
```bash
# Next.js
rm -rf apps/web/.next

# Node modules (if needed)
rm -rf apps/web/node_modules/.cache

# Browser cache (DevTools → Network → Disable cache)
```

### If Auto-fill Doesn't Work

**1. Check Input Attributes:**
```javascript
// Verify autocomplete attributes exist:
document.querySelector('input[type="email"]').getAttribute('autocomplete')
// Should be: "email"

document.querySelector('input[type="password"]').getAttribute('autocomplete')
// Should be: "current-password" or "new-password"
```

**2. Check Form Structure:**
```javascript
// Verify form element exists:
document.querySelector('form')

// Verify inputs have proper IDs:
document.querySelector('#email')
document.querySelector('#password')
```

### If Performance Issues

**1. Check Network Tab:**
- Ensure no unnecessary requests
- Check bundle size hasn't increased
- Verify no duplicate React hydration

**2. Check React DevTools:**
- Install React DevTools extension
- Check for unnecessary re-renders
- Verify component mounting behavior

## Success Criteria Summary

**All tests must pass with:**
- ✅ ZERO hydration errors in console
- ✅ ZERO "Extra attributes" warnings
- ✅ ZERO "Did not expect server HTML" warnings
- ✅ Auto-fill working with all tested password managers
- ✅ Forms functional and responsive
- ✅ Loading skeletons displaying correctly
- ✅ CLS < 0.1 (no layout shift)
- ✅ Forms appear within 100ms of page load

## Regression Testing

After any future changes to:
- Authentication pages
- Form components
- Input components
- Layout components

**Re-run Tests 1, 2, 4, and 5** to ensure hydration fix remains intact.

## Automated Testing (Future)

Consider adding Playwright tests:
```typescript
// Example test
test('login page has no hydration errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  await page.goto('http://localhost:3000/auth/login')
  await page.waitForLoadState('networkidle')

  expect(errors.filter(e => e.includes('Hydration'))).toHaveLength(0)
})
```

---

**Last Updated**: 2025-10-29
**Tested Browsers**: Chrome 131, Firefox 134, Edge 131
**Tested Password Managers**: Dashlane, LastPass, 1Password, Bitwarden

# Screen Reader Testing Guide

**Date:** October 29, 2025
**Coverage:** Login and Register Pages
**WCAG Compliance:** Level AA (2.2)

---

## Overview

This guide provides comprehensive testing procedures for validating screen reader accessibility in the MoneyWise authentication flows. All ARIA attributes and accessibility features must be verified to ensure compliance with WCAG 2.2 Level AA standards.

---

## ARIA Enhancements Applied

### 1. Skeleton Loading States

**Location:** Login and Register pages
**Components:** ClientOnly fallback skeletons

**ARIA Attributes:**
- `role="status"` - Identifies the region as a status update
- `aria-live="polite"` - Announces changes after current speech finishes
- `aria-busy="true"` - Indicates loading/processing state
- `<span className="sr-only">` - Screen reader-only text (hidden visually)
- `aria-hidden="true"` - Hides decorative skeleton elements from assistive technologies

**Expected Behavior:**
1. Screen reader announces: "Loading sign in form..." or "Loading registration form..."
2. Loading state is announced politely (non-interrupting)
3. Skeleton animations are hidden from screen readers
4. User understands content is loading

### 2. Password Toggle Buttons

**Location:** Login page (1 toggle), Register page (2 toggles)
**Components:** Password visibility toggle buttons

**ARIA Attributes:**
- `aria-label` - Descriptive label ("Show password", "Hide password", "Show confirm password", "Hide confirm password")
- `aria-pressed` - Boolean state indicating toggle position (true/false)
- Visual text marked with `aria-hidden="true"` (prevents duplicate announcements)

**Expected Behavior:**
1. Screen reader announces: "Show password, button, not pressed" (when hidden)
2. Screen reader announces: "Hide password, button, pressed" (when visible)
3. Toggle state is clearly communicated
4. No duplicate text announcements (visual "Show"/"Hide" is hidden)

---

## Testing Environments

### Recommended Browser/Screen Reader Combinations

| Browser | Screen Reader | Platform | Priority |
|---------|--------------|----------|----------|
| **Chrome** | NVDA | Windows | ⭐ High |
| **Firefox** | NVDA | Windows | ⭐ High |
| **Safari** | VoiceOver | macOS | ⭐ High |
| **Safari** | VoiceOver | iOS | ⭐ High |
| **Chrome** | TalkBack | Android | Medium |
| **Edge** | Narrator | Windows | Medium |

### Installation

#### NVDA (Windows)
1. Download: https://www.nvaccess.org/download/
2. Install with default settings
3. Start: Ctrl + Alt + N
4. Stop: Insert + Q

#### VoiceOver (macOS)
1. Pre-installed on macOS
2. Start: Cmd + F5
3. Stop: Cmd + F5
4. Quick start: Cmd + Fn + F5

#### VoiceOver (iOS)
1. Settings → Accessibility → VoiceOver
2. Enable VoiceOver
3. Triple-click home/side button for quick toggle

#### TalkBack (Android)
1. Settings → Accessibility → TalkBack
2. Enable TalkBack
3. Volume keys for quick toggle

---

## Testing Procedures

### Test 1: Skeleton Loading State (Login Page)

**Steps:**
1. Start screen reader
2. Navigate to http://localhost:3000/auth/login
3. Wait for page to load

**Expected Announcements:**
```
"Loading sign in form..."
"status"
"busy"
```

**Pass Criteria:**
- ✅ Loading message is announced
- ✅ Status role is identified
- ✅ Busy state is communicated
- ✅ Skeleton elements are NOT announced individually
- ✅ Form appears after loading completes

**Failure Indicators:**
- ❌ No loading announcement
- ❌ Skeleton divs are announced as separate regions
- ❌ Multiple redundant announcements

---

### Test 2: Skeleton Loading State (Register Page)

**Steps:**
1. Start screen reader
2. Navigate to http://localhost:3000/auth/register
3. Wait for page to load

**Expected Announcements:**
```
"Loading registration form..."
"status"
"busy"
```

**Pass Criteria:**
- ✅ Loading message is announced
- ✅ Status role is identified
- ✅ Busy state is communicated
- ✅ Grid layout elements are NOT announced
- ✅ Form appears after loading completes

---

### Test 3: Password Toggle Button (Login Page)

**Steps:**
1. Navigate to http://localhost:3000/auth/login
2. Wait for form to load
3. Tab to password field
4. Tab to password toggle button
5. Press Enter/Space to toggle
6. Press Enter/Space again to toggle back

**Expected Announcements (Initial):**
```
"Show password, button, not pressed"
```

**Expected Announcements (After First Toggle):**
```
"Hide password, button, pressed"
```

**Expected Announcements (After Second Toggle):**
```
"Show password, button, not pressed"
```

**Pass Criteria:**
- ✅ Button is identified as a button
- ✅ Label changes appropriately ("Show" ↔ "Hide")
- ✅ Pressed state is announced (true/false)
- ✅ No duplicate text ("Show" is not announced twice)
- ✅ Password visibility actually toggles

**Failure Indicators:**
- ❌ Button not identified
- ❌ Label doesn't update
- ❌ Pressed state not announced
- ❌ "Show" or "Hide" announced twice

---

### Test 4: Password Toggles (Register Page)

**Steps:**
1. Navigate to http://localhost:3000/auth/register
2. Wait for form to load
3. Tab to password field
4. Tab to password toggle button
5. Test toggle (same as Test 3)
6. Tab to confirm password field
7. Tab to confirm password toggle button
8. Test toggle (same as Test 3)

**Expected Announcements (Password Toggle):**
```
"Show password, button, not pressed"
→ Toggle →
"Hide password, button, pressed"
```

**Expected Announcements (Confirm Password Toggle):**
```
"Show confirm password, button, not pressed"
→ Toggle →
"Hide confirm password, button, pressed"
```

**Pass Criteria:**
- ✅ Both toggles function independently
- ✅ Labels are distinct ("password" vs "confirm password")
- ✅ Pressed states are independent
- ✅ Both password fields respond correctly

---

### Test 5: Form Navigation (Login Page)

**Steps:**
1. Navigate to http://localhost:3000/auth/login
2. Tab through entire form
3. Verify all interactive elements are reachable
4. Verify all labels are announced

**Expected Tab Order:**
1. Email field → "Email, edit, blank"
2. Password field → "Password, edit, password, blank"
3. Password toggle → "Show password, button, not pressed"
4. Sign In button → "Sign In, button"
5. Sign up link → "Sign up, link"

**Pass Criteria:**
- ✅ All fields are reachable via Tab
- ✅ Labels are announced before fields
- ✅ Field types are identified (edit, password, button, link)
- ✅ No keyboard traps
- ✅ Tab order is logical

---

### Test 6: Form Navigation (Register Page)

**Expected Tab Order:**
1. First Name field → "First Name, edit, blank"
2. Last Name field → "Last Name, edit, blank"
3. Email field → "Email, edit, blank"
4. Password field → "Password, edit, password, blank"
5. Password toggle → "Show password, button, not pressed"
6. Confirm Password field → "Confirm Password, edit, password, blank"
7. Confirm password toggle → "Show confirm password, button, not pressed"
8. Create Account button → "Create Account, button"
9. Sign in link → "Sign in, link"

**Pass Criteria:**
- ✅ All fields reachable in logical order
- ✅ Two-column grid doesn't break navigation
- ✅ Both password toggles are accessible
- ✅ No keyboard traps

---

### Test 7: Error State Announcements

**Steps:**
1. Navigate to login page
2. Submit form with empty fields
3. Verify error messages are announced
4. Submit with invalid email
5. Verify validation error is announced

**Expected Behavior:**
- Email error: "Please enter a valid email address"
- Password error: "Password is required"
- Errors announced when field loses focus or on submit

**Pass Criteria:**
- ✅ Errors are announced automatically
- ✅ Error text is associated with correct field
- ✅ Fields are marked as invalid
- ✅ User can correct errors and resubmit

---

### Test 8: Success State Navigation

**Steps:**
1. Complete successful registration
2. Verify redirect to dashboard
3. Verify focus management after redirect

**Expected Behavior:**
- Dashboard title is announced after redirect
- Focus moves to main content region
- User understands they've successfully logged in

**Pass Criteria:**
- ✅ Redirect occurs smoothly
- ✅ New page context is announced
- ✅ Focus is managed appropriately

---

## Testing Checklist

### Pre-Test Setup
- [ ] Dev server running on port 3000
- [ ] Screen reader installed and configured
- [ ] Browser compatible with screen reader
- [ ] Volume/audio enabled

### Login Page Tests
- [ ] Test 1: Skeleton loading state
- [ ] Test 3: Password toggle button
- [ ] Test 5: Form navigation
- [ ] Test 7: Error state announcements
- [ ] Test 8: Success state navigation

### Register Page Tests
- [ ] Test 2: Skeleton loading state
- [ ] Test 4: Password toggles (both)
- [ ] Test 6: Form navigation
- [ ] Test 7: Error state announcements
- [ ] Test 8: Success state navigation

### Cross-Browser Testing
- [ ] Chrome + NVDA (Windows)
- [ ] Firefox + NVDA (Windows)
- [ ] Safari + VoiceOver (macOS)
- [ ] Safari + VoiceOver (iOS)
- [ ] Chrome + TalkBack (Android) - Optional

---

## Common Issues and Solutions

### Issue 1: Skeleton Elements Announced Individually
**Symptom:** Screen reader announces "rectangle", "loading", multiple times
**Cause:** Missing `aria-hidden="true"` on decorative elements
**Solution:** Verify all skeleton divs have `aria-hidden="true"`

### Issue 2: Duplicate Text Announcements
**Symptom:** "Show password, Show password, button"
**Cause:** Visual text not hidden with `aria-hidden="true"`
**Solution:** Wrap "Show"/"Hide" text with `<span aria-hidden="true">`

### Issue 3: Toggle State Not Announced
**Symptom:** Only "button" announced, no pressed state
**Cause:** Missing `aria-pressed` attribute
**Solution:** Add `aria-pressed={showPassword}` to toggle button

### Issue 4: Loading State Not Announced
**Symptom:** Silent during loading, sudden form appearance
**Cause:** Missing `role="status"` or `aria-live="polite"`
**Solution:** Verify both attributes present on skeleton container

### Issue 5: Keyboard Trap in Form
**Symptom:** Cannot Tab out of password field
**Cause:** Toggle button not keyboard accessible
**Solution:** Verify toggle button is `<button type="button">` (not div)

---

## Regression Testing

### After Code Changes
Run these tests whenever:
- Authentication pages are modified
- ClientOnly component is updated
- New form fields are added
- ARIA attributes are changed
- Styling changes affect visibility

### Automated Testing
Consider adding automated accessibility tests:
```bash
# Using axe-core with Playwright
pnpm test:e2e -- --grep "@accessibility"
```

---

## Compliance Standards

### WCAG 2.2 Level AA Requirements Met

**Principle 1: Perceivable**
- ✅ 1.3.1 Info and Relationships (Level A)
  - Semantic HTML, ARIA labels
- ✅ 1.4.13 Content on Hover or Focus (Level AA)
  - No unexpected content changes

**Principle 2: Operable**
- ✅ 2.1.1 Keyboard (Level A)
  - All functionality via keyboard
- ✅ 2.4.3 Focus Order (Level A)
  - Logical tab order maintained
- ✅ 2.4.6 Headings and Labels (Level AA)
  - Descriptive labels provided

**Principle 3: Understandable**
- ✅ 3.2.2 On Input (Level A)
  - No unexpected context changes
- ✅ 3.3.2 Labels or Instructions (Level A)
  - Clear form instructions

**Principle 4: Robust**
- ✅ 4.1.2 Name, Role, Value (Level A)
  - ARIA attributes properly applied
- ✅ 4.1.3 Status Messages (Level AA)
  - Loading states announced

---

## References

- **WCAG 2.2 Guidelines:** https://www.w3.org/WAI/WCAG22/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **MDN ARIA Documentation:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- **ClientOnly Component:** `apps/web/src/components/client-only.tsx`
- **Error Boundary:** `apps/web/src/components/client-only-error-boundary.tsx`
- **Login Page:** `apps/web/app/auth/login/page.tsx:68-162`
- **Register Page:** `apps/web/app/auth/register/page.tsx:75-242`

---

## Quick Reference

### ARIA Roles
- `role="status"` - Status update region (polite announcements)
- `role="alert"` - Error/warning messages (immediate announcements)

### ARIA Properties
- `aria-label` - Text alternative for elements
- `aria-pressed` - Toggle button state (true/false)
- `aria-busy` - Loading indicator (true/false)
- `aria-live` - Announcement priority (polite/assertive/off)
- `aria-hidden` - Hide from assistive tech (true/false)

### Screen Reader-Only Text
```tsx
<span className="sr-only">Text for screen readers only</span>
```

### Toggle Button Pattern
```tsx
<button
  type="button"
  onClick={handleToggle}
  aria-label={isPressed ? 'Hide content' : 'Show content'}
  aria-pressed={isPressed}
>
  <span aria-hidden="true">{isPressed ? 'Hide' : 'Show'}</span>
</button>
```

---

**Last Updated:** October 29, 2025
**Maintained By:** Development Team
**Review Frequency:** After any authentication UI changes

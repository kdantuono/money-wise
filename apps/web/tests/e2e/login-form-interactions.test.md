# Login Form Interactions - E2E Test Documentation

## Test Case: Input Field Click Interactions

### **Status:** ❌ FAILING
### **Priority:** Critical
### **Date:** 2025-09-19

### **Test Description:**
Verify that users can click on and interact with email and password input fields in the futuristic login wall.

### **Expected Behavior:**
- User should be able to click on email input field
- User should be able to type in email input field
- User should be able to click on password input field
- User should be able to type in password input field
- User should be able to click the show/hide password toggle

### **Current Failing Behavior:**
```
TimeoutError: locator.click: Timeout 5000ms exceeded.
<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div> intercepts pointer events
```

### **Root Cause:**
Ambient light effects (decorative background elements) are blocking pointer events to input fields.

### **Elements Blocking Interaction:**
1. `bg-purple-500/10 rounded-full blur-3xl animate-pulse` - Bottom right ambient light
2. Likely also: `bg-cyan-500/10 rounded-full blur-3xl animate-pulse` - Top left ambient light

### **Test Steps to Reproduce:**
1. Navigate to http://localhost:3000
2. Attempt to click on email input field
3. Error: Element is intercepted by ambient light effect

### **Fix Requirements:**
- Add `pointer-events-none` to all ambient light effect elements
- Ensure form elements maintain `pointer-events-auto`
- Verify z-index layering is correct

### **Acceptance Criteria:**
- [ ] Email input field is clickable
- [ ] Password input field is clickable
- [ ] Show/hide password button is clickable
- [ ] Form submission button is clickable
- [ ] All interactions work consistently
- [ ] Visual effects remain intact

---

## **Software Craftsmanship Notes:**

### **TDD Cycle Applied:**
1. **RED:** ❌ Test fails - Input fields not clickable
2. **GREEN:** ✅ Fix ambient light pointer events
3. **REFACTOR:** 🔧 Clean up component structure

### **KISS Principle:**
- Simple fix: Add `pointer-events-none` to decorative elements
- Avoid over-engineering z-index solutions

### **SRP Principle:**
- Ambient lights: Pure visual decoration (no interaction)
- Form elements: User interaction only
- Clear separation of concerns

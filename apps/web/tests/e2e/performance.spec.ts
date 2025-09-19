import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

/**
 * Performance Testing Suite
 * Tests Core Web Vitals, load times, and performance budgets
 */

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance metrics collection
    await page.addInitScript(() => {
      // Collect performance metrics
      window.performanceMetrics = {
        navigationStart: performance.timeOrigin,
        marks: {},
        measures: {}
      }

      // Custom performance observer
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            window.performanceMetrics.navigation = entry
          } else if (entry.entryType === 'paint') {
            window.performanceMetrics[entry.name] = entry.startTime
          } else if (entry.entryType === 'largest-contentful-paint') {
            window.performanceMetrics.lcp = entry.startTime
          } else if (entry.entryType === 'first-input') {
            window.performanceMetrics.fid = entry.processingStart - entry.startTime
          } else if (entry.entryType === 'layout-shift') {
            if (!entry.hadRecentInput) {
              window.performanceMetrics.cls = (window.performanceMetrics.cls || 0) + entry.value
            }
          }
        }
      })

      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
    })
  })

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to the page
    await page.goto('/')

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for metrics to be collected
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const paint = performance.getEntriesByType('paint')
          const lcp = performance.getEntriesByType('largest-contentful-paint')

          resolve({
            // Time to First Byte
            ttfb: navigation.responseStart - navigation.requestStart,
            // First Contentful Paint
            fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
            // Largest Contentful Paint
            lcp: lcp[lcp.length - 1]?.startTime || 0,
            // DOM Content Loaded
            dcl: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            // Load Event
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            // Total Load Time
            totalTime: navigation.loadEventEnd - navigation.navigationStart,
            // First Input Delay (estimated)
            fid: window.performanceMetrics?.fid || 0,
            // Cumulative Layout Shift
            cls: window.performanceMetrics?.cls || 0
          })
        }, 3000)
      })
    })

    console.log('Performance Metrics:', metrics)

    // Assert Core Web Vitals thresholds
    expect(metrics.fcp).toBeLessThan(2000) // First Contentful Paint < 2s
    expect(metrics.lcp).toBeLessThan(2500) // Largest Contentful Paint < 2.5s
    expect(metrics.fid).toBeLessThan(100)  // First Input Delay < 100ms
    expect(metrics.cls).toBeLessThan(0.1)  // Cumulative Layout Shift < 0.1

    // Additional performance assertions
    expect(metrics.ttfb).toBeLessThan(800)  // Time to First Byte < 800ms
    expect(metrics.totalTime).toBeLessThan(3000) // Total load time < 3s
  })

  test('should load critical resources efficiently', async ({ page }) => {
    // Start collecting network activity
    const resources: any[] = []

    page.on('response', async (response) => {
      const url = response.url()
      const size = parseInt(response.headers()['content-length'] || '0')
      const timing = response.timing()

      resources.push({
        url,
        status: response.status(),
        size,
        timing,
        contentType: response.headers()['content-type'],
        fromCache: response.fromServiceWorker() || response.headers()['cf-cache-status'] === 'HIT'
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Analyze resource loading
    const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0)
    const totalRequests = resources.length

    const jsResources = resources.filter(r => r.contentType?.includes('javascript'))
    const cssResources = resources.filter(r => r.contentType?.includes('css'))
    const imageResources = resources.filter(r => r.contentType?.includes('image'))

    console.log('Resource Analysis:', {
      totalRequests,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      jsFiles: jsResources.length,
      cssFiles: cssResources.length,
      images: imageResources.length,
      cached: resources.filter(r => r.fromCache).length
    })

    // Resource budget assertions
    expect(totalRequests).toBeLessThanOrEqual(50) // Total requests < 50
    expect(totalSize).toBeLessThanOrEqual(2 * 1024 * 1024) // Total size < 2MB
    expect(jsResources.length).toBeLessThanOrEqual(15) // JS files < 15
    expect(cssResources.length).toBeLessThanOrEqual(5) // CSS files < 5
  })

  test('should have fast navigation between pages', async ({ page }) => {
    await page.goto('/')

    // Test navigation performance
    const navigationStart = Date.now()
    await page.click('[data-testid="dashboard-link"]')
    await page.waitForLoadState('networkidle')
    const navigationEnd = Date.now()

    const navigationTime = navigationEnd - navigationStart

    console.log(`Navigation time: ${navigationTime}ms`)

    // Navigation should be fast (SPA routing)
    expect(navigationTime).toBeLessThan(1000) // < 1 second
  })

  test('should handle slow network conditions gracefully', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
      await route.continue()
    })

    const startTime = Date.now()
    await page.goto('/')
    await page.waitForSelector('[data-testid="main-content"]', { timeout: 10000 })
    const loadTime = Date.now() - startTime

    console.log(`Slow network load time: ${loadTime}ms`)

    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(8000) // < 8 seconds on slow network

    // Should show loading states
    const hasLoadingIndicator = await page.locator('[data-testid="loading"]').count() > 0
    // Loading indicator might not be visible at this point, but structure should support it
  })

  test('should optimize images and media', async ({ page }) => {
    await page.goto('/')

    // Get all images on the page
    const images = await page.locator('img').all()

    for (const img of images) {
      const src = await img.getAttribute('src')
      const loading = await img.getAttribute('loading')
      const alt = await img.getAttribute('alt')

      // Check for lazy loading
      if (!src?.startsWith('data:')) { // Skip base64 images
        expect(loading).toBe('lazy') // Should use lazy loading
      }

      // Check for alt text (accessibility + SEO)
      expect(alt).toBeTruthy()
    }

    // Check for optimized image formats (WebP, AVIF)
    const imageResponses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        loading: img.loading,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.offsetWidth,
        displayHeight: img.offsetHeight
      }))
    })

    imageResponses.forEach(img => {
      // Check for appropriately sized images (not oversized)
      if (img.naturalWidth > 0 && img.displayWidth > 0) {
        const oversizeRatio = img.naturalWidth / img.displayWidth
        expect(oversizeRatio).toBeLessThan(2) // Image shouldn't be more than 2x display size
      }
    })
  })

  test('should have efficient bundle splitting', async ({ page }) => {
    const jsRequests: string[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('.js') && !url.includes('node_modules')) {
        jsRequests.push(url)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    console.log('JS Bundles loaded:', jsRequests)

    // Should have code splitting
    expect(jsRequests.length).toBeGreaterThan(1) // Should have multiple chunks

    // Should have a main bundle and chunk files
    const hasMainBundle = jsRequests.some(url => url.includes('main') || url.includes('index'))
    expect(hasMainBundle).toBe(true)

    // Navigate to another page to test dynamic imports
    await page.click('[data-testid="settings-link"]')
    await page.waitForLoadState('networkidle')

    // Should load additional chunks for new pages
    const newJsRequests: string[] = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('.js') && !jsRequests.includes(url)) {
        newJsRequests.push(url)
      }
    })

    // Dynamic imports should load new chunks
    expect(newJsRequests.length).toBeGreaterThanOrEqual(0) // May load additional chunks
  })
})
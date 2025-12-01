/**
 * Test Mocks
 * Common mocks for MoneyWise applications
 */

// API Response mocks
export const createMockApiResponse = <T>(data: T, success = true) => ({
  data,
  success,
  message: success ? 'Success' : 'Error',
  timestamp: new Date().toISOString(),
});

export const createMockPaginatedResponse = <T>(
  data: T[],
  page = 1,
  limit = 10,
  total?: number
) => ({
  data,
  pagination: {
    page,
    limit,
    total: total ?? data.length,
    totalPages: Math.ceil((total ?? data.length) / limit),
  },
});

// HTTP Client mocks
export const createMockHttpClient = (responses: Record<string, any> = {}) => ({
  get: jest.fn().mockImplementation((url: string) =>
    Promise.resolve(responses[url] || createMockApiResponse(null))
  ),
  post: jest.fn().mockImplementation((url: string, data: any) =>
    Promise.resolve(responses[url] || createMockApiResponse(data))
  ),
  put: jest.fn().mockImplementation((url: string, data: any) =>
    Promise.resolve(responses[url] || createMockApiResponse(data))
  ),
  delete: jest.fn().mockImplementation((url: string) =>
    Promise.resolve(responses[url] || createMockApiResponse(null))
  ),
});

// Date mocks
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  const originalDate = Date;

  beforeAll(() => {
    // @ts-expect-error - Replacing global Date constructor for testing purposes
    global.Date = jest.fn(() => mockDate);
    global.Date.now = jest.fn(() => mockDate.getTime());
    global.Date.UTC = originalDate.UTC;
    global.Date.parse = originalDate.parse;
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  return mockDate;
};

// Storage mocks
export const createMockStorage = (initialData: Record<string, string> = {}) => {
  let storage = { ...initialData };

  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      storage = {};
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: jest.fn((index: number) => Object.keys(storage)[index] || null),
  };
};

// Console mocks (for suppressing logs in tests)
export const mockConsole = () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  return originalConsole;
};
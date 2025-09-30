/**
 * Mock for @faker-js/faker
 * Provides basic faker functionality for tests without ES module issues
 */

const createFaker = () => ({
  string: {
    uuid: () => {
      // Generate a valid UUID v4 format
      const hex = () => Math.floor(Math.random() * 16).toString(16);
      const s = () => Array(4).fill(0).map(hex).join('');
      return `${s()}${s()}-${s()}-4${Array(3).fill(0).map(hex).join('')}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${Array(3).fill(0).map(hex).join('')}-${s()}${s()}${s()}`;
    },
    alphanumeric: (length: number = 10) => Math.random().toString(36).substring(2, 2 + length),
    alpha: (length: number = 10) => Math.random().toString(36).replace(/[^a-z]/g, '').substring(0, length),
  },
  person: {
    firstName: () => 'Test',
    lastName: () => 'User',
    fullName: () => 'Test User',
  },
  internet: {
    email: () => `test${Date.now()}@example.com`,
    password: () => 'Test Password: `!@#$%^&*()_+-=[]{}|;:,.<>?~',
  },
  number: {
    int: (options?: { min?: number; max?: number }) => {
      const min = options?.min ?? 0;
      const max = options?.max ?? 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    float: (options?: { min?: number; max?: number; precision?: number }) => {
      const min = options?.min ?? 0;
      const max = options?.max ?? 100;
      const precision = options?.precision ?? 2;
      const value = Math.random() * (max - min) + min;
      return Number(value.toFixed(precision));
    },
  },
  datatype: {
    boolean: () => Math.random() < 0.5,
    uuid: () => {
      // Generate a valid UUID v4 format
      const hex = () => Math.floor(Math.random() * 16).toString(16);
      const s = () => Array(4).fill(0).map(hex).join('');
      return `${s()}${s()}-${s()}-4${Array(3).fill(0).map(hex).join('')}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${Array(3).fill(0).map(hex).join('')}-${s()}${s()}${s()}`;
    },
  },
  date: {
    past: () => new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    future: () => new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
    recent: () => new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  },
  finance: {
    amount: (minOrOptions?: number | { min?: number; max?: number; dec?: number }, max?: number, dec?: number): string => {
      // Support both signatures: amount(min, max, dec) and amount({ min, max, dec })
      let minVal: number;
      let maxVal: number;
      let decVal: number;

      if (typeof minOrOptions === 'object' && minOrOptions !== null) {
        minVal = minOrOptions.min ?? 0;
        maxVal = minOrOptions.max ?? 1000;
        decVal = minOrOptions.dec ?? 2;
      } else {
        minVal = (typeof minOrOptions === 'number' ? minOrOptions : 0);
        maxVal = max ?? 1000;
        decVal = dec ?? 2;
      }

      const value = Math.random() * (maxVal - minVal) + minVal;
      return value.toFixed(decVal);
    },
    accountNumber: () => Math.floor(Math.random() * 1000000000).toString().padStart(10, '0'),
    transactionDescription: () => {
      const types = ['Payment', 'Deposit', 'Transfer', 'Withdrawal', 'Purchase', 'Refund'];
      return `${types[Math.floor(Math.random() * types.length)]} - ${Math.random().toString(36).substring(7)}`;
    },
  },
  company: {
    name: () => 'Test Company',
  },
  commerce: {
    department: () => {
      const departments = ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Toys', 'Health', 'Beauty', 'Automotive'];
      return departments[Math.floor(Math.random() * departments.length)];
    },
    productName: () => {
      const adjectives = ['Amazing', 'Fantastic', 'Premium', 'Deluxe', 'Ultimate'];
      const products = ['Widget', 'Gadget', 'Device', 'Tool', 'Item'];
      return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${products[Math.floor(Math.random() * products.length)]}`;
    },
    productDescription: () => {
      const descriptions = [
        'A high-quality product for your needs',
        'Essential item for daily use',
        'Premium quality guaranteed',
        'Best in class product',
        'Trusted by millions',
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    },
  },
  location: {
    country: () => 'Test Country',
    city: () => 'Test City',
    timeZone: () => 'America/New_York',
    streetAddress: () => `${Math.floor(Math.random() * 9999) + 1} Test St`,
    state: () => {
      const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'];
      return states[Math.floor(Math.random() * states.length)];
    },
    zipCode: () => Math.floor(Math.random() * 90000 + 10000).toString(),
    latitude: () => (Math.random() * 180 - 90).toFixed(6),
    longitude: () => (Math.random() * 360 - 180).toFixed(6),
  },
  lorem: {
    sentence: () => 'Test sentence for testing purposes.',
    paragraph: () => 'Test paragraph for testing purposes with multiple sentences.',
    words: (count: number = 3) => Array(count).fill('word').map((w, i) => `${w}${i}`).join(' '),
    word: () => 'word',
  },
  color: {
    rgb: (options?: { format?: 'hex' | 'rgb'; casing?: 'lower' | 'upper' }) => {
      const format = options?.format || 'hex';
      const casing = options?.casing || 'lower';

      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);

      if (format === 'hex') {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return casing === 'lower' ? hex.toLowerCase() : hex.toUpperCase();
      }

      return `rgb(${r}, ${g}, ${b})`;
    },
  },
  image: {
    avatarGitHub: () => `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000000)}`,
    url: () => `https://picsum.photos/200/300?random=${Math.random()}`,
  },
  helpers: {
    arrayElement: <T>(array: T[]) => array[Math.floor(Math.random() * array.length)],
    arrayElements: <T>(array: T[], count?: number) => {
      const n = count ?? Math.floor(Math.random() * array.length) + 1;
      return array.sort(() => 0.5 - Math.random()).slice(0, n);
    },
  },
});

export const faker = createFaker();

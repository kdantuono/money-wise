/**
 * Mock for @faker-js/faker
 * Provides basic faker functionality for tests without ES module issues
 */

const createFaker = () => ({
  string: {
    uuid: () => `${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
    uuid: () => `${Date.now()}-${Math.random().toString(36).substring(7)}`,
  },
  date: {
    past: () => new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    future: () => new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
    recent: () => new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  },
  finance: {
    amount: (min: number = 0, max: number = 1000, dec: number = 2) => {
      const value = Math.random() * (max - min) + min;
      return Number(value.toFixed(dec));
    },
    accountNumber: () => Math.floor(Math.random() * 1000000000).toString().padStart(10, '0'),
  },
  company: {
    name: () => 'Test Company',
  },
  location: {
    country: () => 'Test Country',
    city: () => 'Test City',
    timeZone: () => 'America/New_York',
  },
  lorem: {
    sentence: () => 'Test sentence for testing purposes.',
    paragraph: () => 'Test paragraph for testing purposes with multiple sentences.',
    words: (count: number = 3) => Array(count).fill('word').map((w, i) => `${w}${i}`).join(' '),
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

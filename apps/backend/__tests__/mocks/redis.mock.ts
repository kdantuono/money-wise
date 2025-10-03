import { EventEmitter } from 'events';

/**
 * Complete Redis Mock with EventEmitter
 *
 * Provides full Redis interface including event handling for tests.
 * All methods return promises or appropriate mock values.
 */
export class MockRedis extends EventEmitter {
  // Track call history
  private callHistory: Map<string, any[]> = new Map();

  // Mock storage
  private storage: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  constructor() {
    super();
    // Suppress unhandled error warnings in tests
    this.on('error', () => {});
  }

  // String operations
  get = jest.fn((key: string) => {
    this.recordCall('get', [key]);

    // Check if key has expired
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() >= expiration) {
      this.storage.delete(key);
      this.expirations.delete(key);
      return Promise.resolve(null);
    }

    const value = this.storage.get(key);
    return Promise.resolve(value || null);
  });

  set = jest.fn((key: string, value: string, ...args: any[]) => {
    this.recordCall('set', [key, value, ...args]);
    this.storage.set(key, value);

    // Handle EX/PX options
    if (args.includes('EX')) {
      const ttlIndex = args.indexOf('EX') + 1;
      const ttl = args[ttlIndex];
      this.expirations.set(key, Date.now() + ttl * 1000);
    }

    return Promise.resolve('OK');
  });

  setex = jest.fn((key: string, seconds: number, value: string) => {
    this.recordCall('setex', [key, seconds, value]);
    this.storage.set(key, value);
    this.expirations.set(key, Date.now() + seconds * 1000);
    return Promise.resolve('OK');
  });

  del = jest.fn((...keys: string[]) => {
    this.recordCall('del', keys);
    let deleted = 0;
    for (const key of keys) {
      if (this.storage.delete(key)) {
        deleted++;
      }
      this.expirations.delete(key);
    }
    return Promise.resolve(deleted);
  });

  exists = jest.fn((...keys: string[]) => {
    this.recordCall('exists', keys);
    let count = 0;
    for (const key of keys) {
      if (this.storage.has(key)) {
        count++;
      }
    }
    return Promise.resolve(count);
  });

  // Number operations
  incr = jest.fn((key: string) => {
    this.recordCall('incr', [key]);
    const current = parseInt(this.storage.get(key) || '0', 10);
    const newValue = current + 1;
    this.storage.set(key, newValue.toString());
    return Promise.resolve(newValue);
  });

  decr = jest.fn((key: string) => {
    this.recordCall('decr', [key]);
    const current = parseInt(this.storage.get(key) || '0', 10);
    const newValue = current - 1;
    this.storage.set(key, newValue.toString());
    return Promise.resolve(newValue);
  });

  incrby = jest.fn((key: string, increment: number) => {
    this.recordCall('incrby', [key, increment]);
    const current = parseInt(this.storage.get(key) || '0', 10);
    const newValue = current + increment;
    this.storage.set(key, newValue.toString());
    return Promise.resolve(newValue);
  });

  // Expiration operations
  expire = jest.fn((key: string, seconds: number) => {
    this.recordCall('expire', [key, seconds]);
    if (this.storage.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  });

  ttl = jest.fn((key: string) => {
    this.recordCall('ttl', [key]);
    const expiration = this.expirations.get(key);
    if (!expiration) {
      return Promise.resolve(-1);
    }
    const remaining = Math.ceil((expiration - Date.now()) / 1000);
    return Promise.resolve(remaining > 0 ? remaining : -2);
  });

  pexpire = jest.fn((key: string, milliseconds: number) => {
    this.recordCall('pexpire', [key, milliseconds]);
    if (this.storage.has(key)) {
      this.expirations.set(key, Date.now() + milliseconds);
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  });

  // Key operations
  keys = jest.fn((pattern: string) => {
    this.recordCall('keys', [pattern]);
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys = Array.from(this.storage.keys()).filter(key => regex.test(key));
    return Promise.resolve(matchingKeys);
  });

  scan = jest.fn((cursor: number, ...args: any[]) => {
    this.recordCall('scan', [cursor, ...args]);
    const keys = Array.from(this.storage.keys());
    return Promise.resolve(['0', keys]);
  });

  // Pipeline operations
  pipeline = jest.fn(() => {
    this.recordCall('pipeline', []);
    const commands: any[] = [];

    const pipelineObj = {
      get: (key: string) => {
        commands.push(['get', key]);
        return pipelineObj;
      },
      set: (key: string, value: string) => {
        commands.push(['set', key, value]);
        return pipelineObj;
      },
      del: (...keys: string[]) => {
        commands.push(['del', ...keys]);
        return pipelineObj;
      },
      incr: (key: string) => {
        commands.push(['incr', key]);
        return pipelineObj;
      },
      expire: (key: string, seconds: number) => {
        commands.push(['expire', key, seconds]);
        return pipelineObj;
      },
      hset: (key: string, field: string, value: string) => {
        commands.push(['hset', key, field, value]);
        return pipelineObj;
      },
      hgetall: (key: string) => {
        commands.push(['hgetall', key]);
        return pipelineObj;
      },
      exec: jest.fn(() => {
        // Execute all commands
        const results = commands.map(cmd => {
          const [method, ...args] = cmd;
          if (method === 'get') {
            return [null, this.storage.get(args[0]) || null];
          }
          if (method === 'set') {
            this.storage.set(args[0], args[1]);
            return [null, 'OK'];
          }
          if (method === 'del') {
            const deleted = args.filter(key => this.storage.delete(key)).length;
            return [null, deleted];
          }
          if (method === 'incr') {
            const current = parseInt(this.storage.get(args[0]) || '0', 10);
            const newValue = current + 1;
            this.storage.set(args[0], newValue.toString());
            return [null, newValue];
          }
          if (method === 'expire') {
            return [null, this.storage.has(args[0]) ? 1 : 0];
          }
          if (method === 'hset') {
            const hash = JSON.parse(this.storage.get(args[0]) || '{}');
            hash[args[1]] = args[2];
            this.storage.set(args[0], JSON.stringify(hash));
            return [null, 1];
          }
          if (method === 'hgetall') {
            const hash = JSON.parse(this.storage.get(args[0]) || '{}');
            return [null, hash];
          }
          return [null, 'OK'];
        });
        return Promise.resolve(results);
      }),
    };

    return pipelineObj;
  });

  // Multi/exec (transactions)
  multi = jest.fn(() => {
    return this.pipeline();
  });

  // Database operations
  flushdb = jest.fn(() => {
    this.recordCall('flushdb', []);
    this.storage.clear();
    this.expirations.clear();
    return Promise.resolve('OK');
  });

  flushall = jest.fn(() => {
    this.recordCall('flushall', []);
    this.storage.clear();
    this.expirations.clear();
    return Promise.resolve('OK');
  });

  // Connection operations
  quit = jest.fn(() => {
    this.recordCall('quit', []);
    return Promise.resolve('OK');
  });

  disconnect = jest.fn(() => {
    this.recordCall('disconnect', []);
    this.removeAllListeners();
  });

  // Hash operations
  hset = jest.fn((key: string, fieldOrObj: string | Record<string, string>, value?: string) => {
    this.recordCall('hset', [key, fieldOrObj, value]);
    const hash = JSON.parse(this.storage.get(key) || '{}');

    // Support both object-based and field/value syntax
    if (typeof fieldOrObj === 'object') {
      Object.assign(hash, fieldOrObj);
    } else {
      hash[fieldOrObj] = value;
    }

    this.storage.set(key, JSON.stringify(hash));
    return Promise.resolve(1);
  });

  hget = jest.fn((key: string, field: string) => {
    this.recordCall('hget', [key, field]);
    const hash = JSON.parse(this.storage.get(key) || '{}');
    return Promise.resolve(hash[field] || null);
  });

  hgetall = jest.fn((key: string) => {
    this.recordCall('hgetall', [key]);
    const hash = JSON.parse(this.storage.get(key) || '{}');
    return Promise.resolve(hash);
  });

  hmget = jest.fn((key: string, ...fields: string[]) => {
    this.recordCall('hmget', [key, ...fields]);
    const hash = JSON.parse(this.storage.get(key) || '{}');
    return Promise.resolve(fields.map(field => hash[field] || null));
  });

  hmset = jest.fn((key: string, ...fieldValues: any[]) => {
    this.recordCall('hmset', [key, ...fieldValues]);
    const hash = JSON.parse(this.storage.get(key) || '{}');

    // Handle both array and object formats
    if (typeof fieldValues[0] === 'object' && !Array.isArray(fieldValues[0])) {
      Object.assign(hash, fieldValues[0]);
    } else {
      for (let i = 0; i < fieldValues.length; i += 2) {
        hash[fieldValues[i]] = fieldValues[i + 1];
      }
    }

    this.storage.set(key, JSON.stringify(hash));
    return Promise.resolve('OK');
  });

  hdel = jest.fn((key: string, ...fields: string[]) => {
    this.recordCall('hdel', [key, ...fields]);
    const hash = JSON.parse(this.storage.get(key) || '{}');
    let deleted = 0;
    for (const field of fields) {
      if (delete hash[field]) {
        deleted++;
      }
    }
    this.storage.set(key, JSON.stringify(hash));
    return Promise.resolve(deleted);
  });

  // List operations
  lpush = jest.fn((key: string, ...values: string[]) => {
    this.recordCall('lpush', [key, ...values]);
    const list = JSON.parse(this.storage.get(key) || '[]');
    list.unshift(...values);
    this.storage.set(key, JSON.stringify(list));
    return Promise.resolve(list.length);
  });

  rpush = jest.fn((key: string, ...values: string[]) => {
    this.recordCall('rpush', [key, ...values]);
    const list = JSON.parse(this.storage.get(key) || '[]');
    list.push(...values);
    this.storage.set(key, JSON.stringify(list));
    return Promise.resolve(list.length);
  });

  lrange = jest.fn((key: string, start: number, stop: number) => {
    this.recordCall('lrange', [key, start, stop]);
    const list = JSON.parse(this.storage.get(key) || '[]');
    return Promise.resolve(list.slice(start, stop + 1));
  });

  // Set operations
  sadd = jest.fn((key: string, ...members: string[]) => {
    this.recordCall('sadd', [key, ...members]);
    const set = new Set(JSON.parse(this.storage.get(key) || '[]'));
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    this.storage.set(key, JSON.stringify(Array.from(set)));
    return Promise.resolve(added);
  });

  smembers = jest.fn((key: string) => {
    this.recordCall('smembers', [key]);
    const members = JSON.parse(this.storage.get(key) || '[]');
    return Promise.resolve(members);
  });

  sismember = jest.fn((key: string, member: string) => {
    this.recordCall('sismember', [key, member]);
    const set = new Set(JSON.parse(this.storage.get(key) || '[]'));
    return Promise.resolve(set.has(member) ? 1 : 0);
  });

  // Sorted set operations
  zadd = jest.fn((key: string, score: number, member: string) => {
    this.recordCall('zadd', [key, score, member]);
    const zset = JSON.parse(this.storage.get(key) || '[]');
    zset.push({ score, member });
    this.storage.set(key, JSON.stringify(zset));
    return Promise.resolve(1);
  });

  zrange = jest.fn((key: string, start: number, stop: number) => {
    this.recordCall('zrange', [key, start, stop]);
    const zset = JSON.parse(this.storage.get(key) || '[]');
    return Promise.resolve(zset.slice(start, stop + 1).map((item: any) => item.member));
  });

  // Test utilities
  private recordCall(method: string, args: any[]) {
    if (!this.callHistory.has(method)) {
      this.callHistory.set(method, []);
    }
    this.callHistory.get(method)!.push(args);
  }

  // Mock reset for tests
  __reset() {
    this.storage.clear();
    this.expirations.clear();
    this.callHistory.clear();
    jest.clearAllMocks();
  }

  // Get call history for assertions
  __getCallHistory(method: string) {
    return this.callHistory.get(method) || [];
  }
}

/**
 * Create a new MockRedis instance for tests
 */
export function createMockRedis(): MockRedis {
  return new MockRedis();
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_URL') return 'redis://localhost:6380';
              if (key === 'CACHE_TTL') return 300;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    
    // Manually set redisClient to mock for testing
    (service as any).redisClient = mockRedis;
    (service as any).enabled = true;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const mockValue = JSON.stringify({ data: 'test' });
      mockRedis.get.mockResolvedValue(mockValue);

      const result = await service.get('test-key');

      expect(result).toEqual({ data: 'test' });
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      mockRedis.setex.mockResolvedValue('OK' as any);

      const result = await service.set('test-key', { data: 'test' }, 300);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify({ data: 'test' }),
      );
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      mockRedis.del.mockResolvedValue(1 as any);

      const result = await service.del('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });
});


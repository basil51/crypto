import { Test, TestingModule } from '@nestjs/testing';
import { TokensService } from './tokens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

describe('TokensService', () => {
  let service: TokensService;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockPrisma = {
      token: {
        create: jest.fn().mockResolvedValue({ id: '1', symbol: 'ETH' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: '1', symbol: 'ETH' }),
        delete: jest.fn().mockResolvedValue({ id: '1', symbol: 'ETH' }),
      },
    };

    const mockCache = {
      getOrSet: jest.fn(),
      del: jest.fn(),
      invalidate: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
    prismaService = module.get(PrismaService) as any;
    cacheService = module.get(CacheService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return tokens from cache or database', async () => {
      const mockTokens = [
        { id: '1', symbol: 'ETH', name: 'Ethereum' },
        { id: '2', symbol: 'BTC', name: 'Bitcoin' },
      ];

      cacheService.getOrSet.mockResolvedValue(mockTokens);

      const result = await service.findAll();

      expect(result).toEqual(mockTokens);
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a token by id', async () => {
      const mockToken = { id: '1', symbol: 'ETH', name: 'Ethereum' };

      cacheService.getOrSet.mockResolvedValue(mockToken);

      const result = await service.findOne('1');

      expect(result).toEqual(mockToken);
    });
  });

  describe('create', () => {
    it('should create a token and invalidate cache', async () => {
      const mockToken = { id: '1', symbol: 'ETH', name: 'Ethereum' };
      const createData = { symbol: 'ETH', name: 'Ethereum', chain: 'ethereum' };

      (prismaService.token.create as jest.Mock).mockResolvedValue(mockToken);
      cacheService.invalidate.mockResolvedValue(undefined);

      const result = await service.create(createData as any);

      expect(result).toEqual(mockToken);
      expect(prismaService.token.create).toHaveBeenCalledWith({ data: createData });
      expect(cacheService.invalidate).toHaveBeenCalledWith('tokens:*');
    });
  });
});


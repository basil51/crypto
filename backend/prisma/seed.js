"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = __importStar(require("bcrypt"));
var dotenv = __importStar(require("dotenv"));
var path_1 = require("path");
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
// Load environment variables
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../.env') });
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../.env') });
// Create PostgreSQL connection pool
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}
var pool = new pg_1.Pool({ connectionString: connectionString });
// Create Prisma adapter
var adapter = new adapter_pg_1.PrismaPg(pool);
var prisma = new client_1.PrismaClient({ adapter: adapter });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, testUser, tokens, createdTokens, _i, tokens_1, tokenData, token, wallets, createdWallets, _a, wallets_1, walletData, wallet, now, transactions, i, token, fromWallet, toWallet, j, timestamp, amount, blockNumber, _b, transactions_1, txData, error_1, _c, createdWallets_1, wallet, _d, _e, token, balance, signalTypes, i, token, signalType, score, windowStart, windowEnd, walletsInvolved, i, token, scoreValue, windowStart, windowEnd, signal;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('🌱 Starting database seed...');
                    // Clear existing data (in reverse order of dependencies)
                    console.log('🗑️  Clearing existing data...');
                    return [4 /*yield*/, prisma.alert.deleteMany()];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, prisma.accumulationSignal.deleteMany()];
                case 2:
                    _f.sent();
                    return [4 /*yield*/, prisma.walletPosition.deleteMany()];
                case 3:
                    _f.sent();
                    return [4 /*yield*/, prisma.transaction.deleteMany()];
                case 4:
                    _f.sent();
                    return [4 /*yield*/, prisma.wallet.deleteMany()];
                case 5:
                    _f.sent();
                    return [4 /*yield*/, prisma.token.deleteMany()];
                case 6:
                    _f.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 7:
                    _f.sent();
                    return [4 /*yield*/, prisma.apiUsageLog.deleteMany()];
                case 8:
                    _f.sent();
                    console.log('✅ Database cleared');
                    // Create test user
                    console.log('👤 Creating test user...');
                    return [4 /*yield*/, bcrypt.hash('password123', 10)];
                case 9:
                    passwordHash = _f.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'test@example.com',
                                passwordHash: passwordHash,
                                role: 'USER',
                                plan: 'PRO',
                                subscriptionStatus: 'active',
                                subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                            },
                        })];
                case 10:
                    testUser = _f.sent();
                    console.log('✅ Created test user');
                    console.log('   - test@example.com / password123 (USER, PRO, active subscription)');
                    // Create test tokens
                    console.log('🪙 Creating test tokens...');
                    _f.label = 11;
                case 11:
                    // Create test tokens
                    console.log('🪙 Creating test tokens...');
                    tokens = [
                        {
                            chain: 'ethereum',
                            symbol: 'ETH',
                            name: 'Ethereum',
                            contractAddress: '0x0000000000000000000000000000000000000000',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'ethereum' },
                        },
                        {
                            chain: 'ethereum',
                            symbol: 'USDC',
                            name: 'USD Coin',
                            contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                            decimals: 6,
                            active: true,
                            metadata: { coingeckoId: 'usd-coin' },
                        },
                        {
                            chain: 'ethereum',
                            symbol: 'WBTC',
                            name: 'Wrapped Bitcoin',
                            contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                            decimals: 8,
                            active: true,
                            metadata: { coingeckoId: 'wrapped-bitcoin' },
                        },
                        {
                            chain: 'bsc',
                            symbol: 'BNB',
                            name: 'Binance Coin',
                            contractAddress: '0x0000000000000000000000000000000000000000',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'binancecoin' },
                        },
                        {
                            chain: 'bsc',
                            symbol: 'CAKE',
                            name: 'PancakeSwap Token',
                            contractAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'pancakeswap-token' },
                        },
                        {
                            chain: 'polygon',
                            symbol: 'MATIC',
                            name: 'Polygon',
                            contractAddress: '0x0000000000000000000000000000000000000000',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'matic-network' },
                        },
                        {
                            chain: 'ethereum',
                            symbol: 'LINK',
                            name: 'Chainlink',
                            contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'chainlink' },
                        },
                        {
                            chain: 'ethereum',
                            symbol: 'UNI',
                            name: 'Uniswap',
                            contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'uniswap' },
                        },
                        {
                            chain: 'bsc',
                            symbol: 'BUSD',
                            name: 'Binance USD',
                            contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                            decimals: 18,
                            active: true,
                            metadata: { coingeckoId: 'binance-usd' },
                        },
                        {
                            chain: 'solana',
                            symbol: 'SOL',
                            name: 'Solana',
                            contractAddress: 'So11111111111111111111111111111111111111112',
                            decimals: 9,
                            active: true,
                            metadata: { coingeckoId: 'solana' },
                        },
                        {
                            chain: 'solana',
                            symbol: 'USDC',
                            name: 'USD Coin (Solana)',
                            contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                            decimals: 6,
                            active: true,
                            metadata: { coingeckoId: 'usd-coin', solanaMint: true },
                        },
                        {
                            chain: 'solana',
                            symbol: 'USDT',
                            name: 'Tether USD (Solana)',
                            contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                            decimals: 6,
                            active: true,
                            metadata: { coingeckoId: 'tether', solanaMint: true },
                        },
                    ];
                    createdTokens = [];
                    _i = 0, tokens_1 = tokens;
                    _f.label = 12;
                case 12:
                    if (!(_i < tokens_1.length)) return [3 /*break*/, 15];
                    tokenData = tokens_1[_i];
                    return [4 /*yield*/, prisma.token.create({ data: tokenData })];
                case 13:
                    token = _f.sent();
                    createdTokens.push(token);
                    _f.label = 14;
                case 14:
                    _i++;
                    return [3 /*break*/, 12];
                case 15:
                    console.log("\u2705 Created ".concat(createdTokens.length, " tokens"));
                    // Create test wallets
                    console.log('💼 Creating test wallets...');
                    wallets = [
                        {
                            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                            label: 'Whale Wallet 1',
                            tracked: true,
                        },
                        {
                            address: '0x8ba1f109551bD432803012645Hac136c22C9299',
                            label: 'Exchange Wallet',
                            tracked: true,
                        },
                        {
                            address: '0x1234567890123456789012345678901234567890',
                            label: 'Regular Wallet 1',
                            tracked: false,
                        },
                        {
                            address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                            label: 'Whale Wallet 2',
                            tracked: true,
                        },
                    ];
                    createdWallets = [];
                    _a = 0, wallets_1 = wallets;
                    _f.label = 16;
                case 16:
                    if (!(_a < wallets_1.length)) return [3 /*break*/, 19];
                    walletData = wallets_1[_a];
                    return [4 /*yield*/, prisma.wallet.create({ data: walletData })];
                case 17:
                    wallet = _f.sent();
                    createdWallets.push(wallet);
                    _f.label = 18;
                case 18:
                    _a++;
                    return [3 /*break*/, 16];
                case 19:
                    console.log("\u2705 Created ".concat(createdWallets.length, " wallets"));
                    // Create test transactions
                    console.log('📝 Creating test transactions...');
                    now = new Date();
                    transactions = [];
                    // Create transactions for each token
                    for (i = 0; i < createdTokens.length; i++) {
                        token = createdTokens[i];
                        fromWallet = createdWallets[i % createdWallets.length];
                        toWallet = createdWallets[(i + 1) % createdWallets.length];
                        // Create multiple transactions per token
                        for (j = 0; j < 10; j++) {
                            timestamp = new Date(now.getTime() - (j * 60 * 60 * 1000));
                            amount = BigInt(Math.floor(Math.random() * 1000000) + 100000);
                            blockNumber = BigInt(18000000 + j);
                            transactions.push({
                                txHash: "0x".concat(Math.random().toString(16).substring(2, 66)),
                                fromAddress: fromWallet.address,
                                toAddress: toWallet.address,
                                tokenId: token.id,
                                amount: amount.toString(),
                                blockNumber: blockNumber.toString(),
                                timestamp: timestamp,
                                raw: {
                                    provider: 'moralis',
                                    blockHash: "0x".concat(Math.random().toString(16).substring(2, 66)),
                                },
                            });
                        }
                    }
                    _b = 0, transactions_1 = transactions;
                    _f.label = 22;
                case 22:
                    if (!(_b < transactions_1.length)) return [3 /*break*/, 27];
                    txData = transactions_1[_b];
                    _f.label = 23;
                case 23:
                    _f.trys.push([23, 25, , 26]);
                    return [4 /*yield*/, prisma.transaction.create({ data: txData })];
                case 24:
                    _f.sent();
                    return [3 /*break*/, 26];
                case 25:
                    error_1 = _f.sent();
                    // Skip duplicates
                    if (error_1.code !== 'P2002') {
                        throw error_1;
                    }
                    return [3 /*break*/, 26];
                case 26:
                    _b++;
                    return [3 /*break*/, 22];
                case 27:
                    console.log("\u2705 Created ".concat(transactions.length, " transactions"));
                    // Create wallet positions
                    console.log('💰 Creating wallet positions...');
                    _c = 0, createdWallets_1 = createdWallets;
                    _f.label = 28;
                case 28:
                    if (!(_c < createdWallets_1.length)) return [3 /*break*/, 33];
                    wallet = createdWallets_1[_c];
                    _d = 0, _e = createdTokens.slice(0, 3);
                    _f.label = 29;
                case 29:
                    if (!(_d < _e.length)) return [3 /*break*/, 32];
                    token = _e[_d];
                    balance = (Math.random() * 1000000).toFixed(0);
                    return [4 /*yield*/, prisma.walletPosition.upsert({
                            where: {
                                walletId_tokenId: {
                                    walletId: wallet.id,
                                    tokenId: token.id,
                                },
                            },
                            update: {
                                balance: balance,
                                lastUpdatedAt: new Date(),
                            },
                            create: {
                                walletId: wallet.id,
                                tokenId: token.id,
                                balance: balance,
                            },
                        })];
                case 30:
                    _f.sent();
                    _f.label = 31;
                case 31:
                    _d++;
                    return [3 /*break*/, 29];
                case 32:
                    _c++;
                    return [3 /*break*/, 28];
                case 33:
                    console.log('✅ Created wallet positions');
                    // Create accumulation signals
                    console.log('🚨 Creating accumulation signals...');
                    signalTypes = ['WHALE_INFLOW', 'EXCHANGE_OUTFLOW', 'CONCENTRATED_BUYS', 'HOLDING_PATTERNS', 'LP_INCREASE'];
                    i = 0;
                    _f.label = 34;
                case 34:
                    if (!(i < createdTokens.length)) return [3 /*break*/, 37];
                    token = createdTokens[i];
                    signalType = signalTypes[i % signalTypes.length];
                    score = 60 + Math.random() * 35;
                    windowStart = new Date(now.getTime() - (24 * 60 * 60 * 1000));
                    windowEnd = new Date(now.getTime() - (1 * 60 * 60 * 1000));
                    walletsInvolved = createdWallets
                        .slice(0, Math.floor(Math.random() * 3) + 1)
                        .map(function (w) { return w.address; });
                    return [4 /*yield*/, prisma.accumulationSignal.create({
                            data: {
                                tokenId: token.id,
                                score: score.toFixed(2),
                                signalType: signalType,
                                windowStart: windowStart,
                                windowEnd: windowEnd,
                                walletsInvolved: walletsInvolved,
                                metadata: {
                                    transactionCount: Math.floor(Math.random() * 50) + 10,
                                    totalVolume: (Math.random() * 1000000).toFixed(2),
                                    averageBuySize: (Math.random() * 100000).toFixed(2),
                                },
                            },
                        })];
                case 35:
                    _f.sent();
                    _f.label = 36;
                case 36:
                    i++;
                    return [3 /*break*/, 34];
                case 37:
                    i = 0;
                    _f.label = 38;
                case 38:
                    if (!(i < 3)) return [3 /*break*/, 42];
                    token = createdTokens[Math.floor(Math.random() * createdTokens.length)];
                    scoreValue = 75 + Math.random() * 20;
                    windowStart = new Date(now.getTime() - (6 * 60 * 60 * 1000));
                    windowEnd = new Date(now.getTime() - (30 * 60 * 1000));
                    return [4 /*yield*/, prisma.accumulationSignal.create({
                            data: {
                                tokenId: token.id,
                                score: scoreValue.toFixed(2),
                                signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
                                windowStart: windowStart,
                                windowEnd: windowEnd,
                                walletsInvolved: createdWallets.slice(0, 2).map(function (w) { return w.address; }),
                                metadata: {
                                    transactionCount: Math.floor(Math.random() * 100) + 20,
                                    totalVolume: (Math.random() * 2000000).toFixed(2),
                                    averageBuySize: (Math.random() * 200000).toFixed(2),
                                },
                            },
                        })];
                case 39:
                    signal = _f.sent();
                    if (!(scoreValue >= 75)) return [3 /*break*/, 41];
                    return [4 /*yield*/, prisma.alert.create({
                            data: {
                                userId: testUser.id,
                                signalId: signal.id,
                                channels: { telegram: false, email: true },
                                status: 'PENDING',
                            },
                        })];
                case 40:
                    _f.sent();
                    _f.label = 41;
                case 41:
                    i++;
                    return [3 /*break*/, 38];
                case 42:
                    console.log('✅ Created accumulation signals and alerts');
                    console.log('\n✨ Seed completed successfully!');
                    console.log('\n📋 Test Credentials:');
                    console.log('   Email:    test@example.com');
                    console.log('   Password: password123');
                    console.log('   Plan:     PRO (active subscription)');
                    console.log('\n🌐 Frontend: http://localhost:3000');
                    console.log('🔌 Backend:  http://localhost:3001/api');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });

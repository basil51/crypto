import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('should reject duplicate email', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      // Create user first
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      // Try to register again
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password })
        .expect(409);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('/api/auth/login (POST)', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = `test-${Date.now()}@example.com`;
      testPassword = 'password123';
      const passwordHash = await bcrypt.hash(testPassword, 10);

      await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash,
          role: 'USER',
          plan: 'FREE',
        },
      });
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { email: testEmail } });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);
    });
  });
});


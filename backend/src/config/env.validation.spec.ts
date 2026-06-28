import { validateEnv } from './env.validation';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a-sufficiently-long-secret',
  ADMIN_EMAIL: 'admin@growthlab.local',
  ADMIN_PASSWORD: 'change-this-password',
};

describe('validateEnv', () => {
  it('accepts a valid configuration and applies defaults', () => {
    const config = validateEnv({ ...baseEnv });

    expect(config.DATABASE_URL).toBe(baseEnv.DATABASE_URL);
    expect(config.PORT).toBe(3001);
    expect(config.NODE_ENV).toBe('development');
  });

  it('coerces numeric strings', () => {
    const config = validateEnv({ ...baseEnv, PORT: '4000' });
    expect(config.PORT).toBe(4000);
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL, ...withoutDb } = baseEnv;
    void DATABASE_URL;
    expect(() => validateEnv(withoutDb)).toThrow(/Invalid environment configuration/);
  });

  it('rejects a too-short JWT_SECRET', () => {
    expect(() => validateEnv({ ...baseEnv, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });
});

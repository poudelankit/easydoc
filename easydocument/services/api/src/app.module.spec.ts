import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";

describe("AppModule", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      JWT_SECRET: "test-only-strong-secret",
      DATABASE_URL: "postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument",
      REDIS_URL: "redis://localhost:6379",
      MINIO_ENDPOINT: "localhost",
      MINIO_PORT: "9000"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("compiles the application module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

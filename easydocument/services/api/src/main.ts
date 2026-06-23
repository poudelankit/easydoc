import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { resolveCorsOrigin, validateRuntimeEnvironment } from "./common/config/security-env";
import { RequestLoggingInterceptor } from "./common/logging/request-logging.interceptor";
import { writeStructuredLog } from "./common/logging/structured-logger";

async function bootstrap() {
  const environmentValidation = validateRuntimeEnvironment();
  for (const warning of environmentValidation.warnings) {
    writeStructuredLog("warn", "environment.validation.warning", { warning });
  }

  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.setGlobalPrefix("v1", {
    exclude: [
      { path: "health/live", method: RequestMethod.GET },
      { path: "health/ready", method: RequestMethod.GET },
      { path: "health/database", method: RequestMethod.GET },
      { path: "health/redis", method: RequestMethod.GET },
      { path: "health/minio", method: RequestMethod.GET },
      { path: "health/otp-provider", method: RequestMethod.GET },
      { path: "health/push-provider", method: RequestMethod.GET },
      { path: "metrics", method: RequestMethod.GET }
    ]
  });

  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  writeStructuredLog("info", "api.started", { port, nodeEnv: environmentValidation.nodeEnv });
}

void bootstrap();

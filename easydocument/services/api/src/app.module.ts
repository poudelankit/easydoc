import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AgentsModule } from "./modules/agents/agents.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { RedisModule } from "./modules/redis/redis.module";
import { StorageModule } from "./modules/storage/storage.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    StorageModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    AgentsModule,
    AdminModule,
    HealthModule
  ]
})
export class AppModule {}

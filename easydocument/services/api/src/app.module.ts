import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AgentsModule } from "./modules/agents/agents.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PushModule } from "./modules/push/push.module";
import { RedisModule } from "./modules/redis/redis.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { StorageModule } from "./modules/storage/storage.module";
import { SmsModule } from "./modules/sms/sms.module";
import { RateLimitModule } from "./modules/rate-limit/rate-limit.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { DisputesModule } from "./modules/disputes/disputes.module";
import { TasksModule } from "./modules/tasks/tasks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    StorageModule,
    SmsModule,
    PushModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CommunicationModule,
    DisputesModule,
    ReviewsModule,
    CustomersModule,
    TasksModule,
    AgentsModule,
    AdminModule,
    HealthModule
  ]
})
export class AppModule {}

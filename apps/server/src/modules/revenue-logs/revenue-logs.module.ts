import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevenueLog, RevenueLogSchema } from './revenue-log.schema';
import { Department, DepartmentSchema } from '../departments/department.schema';
import { RevenueLogsController } from './revenue-logs.controller';
import { RevenueLogsService } from './revenue-logs.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RevenueLog.name, schema: RevenueLogSchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [RevenueLogsController],
  providers: [RevenueLogsService],
  exports: [RevenueLogsService, MongooseModule],
})
export class RevenueLogsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from './branch.schema';
import { BranchesController } from './branches.controller';
import { RedisService } from '../redis/redis.service';
import { BranchService } from './branches.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Branch.name, schema: BranchSchema }])],
  controllers: [BranchesController],
  providers: [BranchService, RedisService]
})
export class BranchesModule {}

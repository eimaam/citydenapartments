import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './user.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redis.get(CACHE_KEYS.USERS_LIST);
    if (cached) return JSON.parse(cached);

    const users = await this.userModel.find().select('-password').lean();
    await this.redis.set(CACHE_KEYS.USERS_LIST, JSON.stringify(users), CACHE_TTL.ONE_MINUTE);
    return users;
  }

  async findOne(id: string) {
    const cached = await this.redis.get(CACHE_KEYS.USER(id));
    if (cached) return JSON.parse(cached);

    const user = await this.userModel.findById(id).select('-password').lean();
    if (!user) throw new NotFoundException('User not found.');

    await this.redis.set(CACHE_KEYS.USER(id), JSON.stringify(user), CACHE_TTL.ONE_HOUR);
    return user;
  }

  async create(dto: { email: string; password: string; name: string; role: string; allowedBranches?: string[] }) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new BadRequestException('Email already registered.');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      password: hashed,
      name: dto.name,
      role: dto.role,
      allowedBranches: dto.allowedBranches ?? [],
      isActive: true,
    });

    await this.redis.del(CACHE_KEYS.USERS_LIST);
    return this.userModel.findById(user._id).select('-password').lean();
  }

  async update(id: string, dto: { name?: string; role?: string; allowedBranches?: string[]; activeBranchId?: string; isActive?: boolean }) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role as any;
    if (dto.allowedBranches !== undefined) user.allowedBranches = dto.allowedBranches as any;
    if (dto.activeBranchId !== undefined) user.activeBranchId = dto.activeBranchId as any;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await user.save();

    await Promise.all([
      this.redis.del(CACHE_KEYS.USER(id)),
      this.redis.del(CACHE_KEYS.USERS_LIST),
      this.redis.del(CACHE_KEYS.USER_SESSION(id)),
    ]);

    return this.userModel.findById(id).select('-password').lean();
  }
}

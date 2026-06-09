import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRoleEnum } from './user.schema';
import { Branch } from '../branches/branch.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';
import { escapeRegex } from '../../common/utils/escape-regex';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[crypto.randomInt(chars.length)];
  return pwd;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    private readonly redis: RedisService,
  ) {}

  async findAll(params?: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params || {};
    const filter: any = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.userModel.find(filter).select('-password').skip(skip).limit(limit).lean(),
      this.userModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const cached = await this.redis.get(CACHE_KEYS.USER(id));
    if (cached) return JSON.parse(cached);
    const user = await this.userModel.findById(id).select('-password').lean();
    if (!user) throw new NotFoundException('User not found.');
    await this.redis.set(CACHE_KEYS.USER(id), JSON.stringify(user), CACHE_TTL.ONE_HOUR);
    return user;
  }

  async create(dto: { email: string; name: string; role: string; allowedBranches?: string[] }) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new BadRequestException('Email already registered.');

    if (dto.allowedBranches?.length) {
      const validBranches = await this.branchModel.find({
        _id: { $in: dto.allowedBranches },
        isActive: true,
      });
      if (validBranches.length !== dto.allowedBranches.length) {
        throw new BadRequestException('One or more allowed branches are invalid or inactive.');
      }
    }

    const rawPassword = generatePassword();
    const hashed = await bcrypt.hash(rawPassword, 12);

    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      password: hashed,
      name: dto.name,
      role: dto.role,
      allowedBranches: dto.allowedBranches ?? [],
      activeBranchId: dto.allowedBranches?.[0] ?? null,
      isActive: true,
    });

    await this.redis.del(CACHE_KEYS.USERS_LIST);

    const sanitized = await this.userModel.findById(user._id).select('-password').lean();
    return { user: sanitized, generatedPassword: rawPassword };
  }

  async update(id: string, dto: { name?: string; role?: string; allowedBranches?: string[]; activeBranchId?: string; isActive?: boolean }) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role as any;
    if (dto.allowedBranches !== undefined) {
      if (dto.allowedBranches.length) {
        const validBranches = await this.branchModel.find({
          _id: { $in: dto.allowedBranches },
          isActive: true,
        });
        if (validBranches.length !== dto.allowedBranches.length) {
          throw new BadRequestException('One or more allowed branches are invalid or inactive.');
        }
      }
      user.allowedBranches = dto.allowedBranches as any;
    }
    if (dto.activeBranchId !== undefined) {
      const newRole = dto.role !== undefined ? dto.role : (user.role as string);
      if (newRole !== UserRoleEnum.SUPER_ADMIN) {
        const allowed = dto.allowedBranches !== undefined
          ? dto.allowedBranches.map((b: any) => b.toString())
          : user.allowedBranches.map((b: any) => b.toString());
        if (!allowed.includes(dto.activeBranchId.toString())) {
          throw new BadRequestException('Active branch must be in allowed branches.');
        }
      }
      user.activeBranchId = dto.activeBranchId as any;
    }
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await user.save();

    await Promise.all([
      this.redis.del(CACHE_KEYS.USER(id)),
      this.redis.del(CACHE_KEYS.USERS_LIST),
      this.redis.del(CACHE_KEYS.USER_SESSION(id)),
    ]);

    return this.userModel.findById(id).select('-password').lean();
  }

  async resetPassword(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');

    const rawPassword = generatePassword();
    user.password = await bcrypt.hash(rawPassword, 12);
    user.passwordChangedAt = null;
    await user.save();

    await Promise.all([
      this.redis.del(CACHE_KEYS.USER(id)),
      this.redis.del(CACHE_KEYS.USER_SESSION(id)),
      this.redis.del(CACHE_KEYS.USERS_LIST),
    ]);

    return { user: await this.userModel.findById(id).select('-password').lean(), generatedPassword: rawPassword };
  }
}

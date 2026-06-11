import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    params?: { page?: number; limit?: number; search?: string },
    caller?: { role: string; activeBranchId: string },
  ) {
    const { page = 1, limit = 20, search } = params || {};
    const filter: any = {};

    if (caller?.role === UserRoleEnum.BRANCH_MANAGER) {
      filter.allowedBranches = caller.activeBranchId;
    }

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

  async findOne(id: string, caller?: { role: string; activeBranchId: string }) {
    const cached = await this.redis.get(CACHE_KEYS.USER(id));
    if (cached && caller?.role !== UserRoleEnum.BRANCH_MANAGER) return JSON.parse(cached);
    const user = await this.userModel.findById(id).select('-password').lean();
    if (!user) {
      this.logger.warn(`User not found — id: ${id}`);
      throw new NotFoundException('User not found.');
    }

    if (caller?.role === UserRoleEnum.BRANCH_MANAGER) {
      const branchIdStr = caller.activeBranchId?.toString();
      const userBranchIds = (user.allowedBranches || []).map((b: any) => b.toString());
      if (!userBranchIds.includes(branchIdStr)) {
        throw new ForbiddenException('User not in your branch.');
      }
    }

    await this.redis.set(CACHE_KEYS.USER(id), JSON.stringify(user), CACHE_TTL.ONE_HOUR);
    return user;
  }

  async create(
    dto: { email: string; name: string; role: string; allowedBranches?: string[] },
    caller?: { role: string; activeBranchId: string },
  ) {
    if (caller?.role === UserRoleEnum.BRANCH_MANAGER) {
      if (dto.role === UserRoleEnum.SUPER_ADMIN || dto.role === UserRoleEnum.BRANCH_MANAGER) {
        throw new BadRequestException('Cannot create admin or manager accounts.');
      }
      dto.allowedBranches = [caller.activeBranchId];
    }

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
    this.logger.log(`User created — ${user.email} | role: ${user.role} | by ${caller?.role ?? 'admin'}`);
    return { user: sanitized, generatedPassword: rawPassword };
  }

  async update(
    id: string,
    dto: { name?: string; role?: string; allowedBranches?: string[]; activeBranchId?: string; isActive?: boolean },
    caller?: { role: string; activeBranchId: string },
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      this.logger.warn(`User not found — id: ${id}`);
      throw new NotFoundException('User not found.');
    }

    if (caller?.role === UserRoleEnum.BRANCH_MANAGER) {
      const branchIdStr = caller.activeBranchId?.toString();
      const userBranchIds = (user.allowedBranches || []).map((b: any) => b.toString());
      if (!userBranchIds.includes(branchIdStr)) {
        throw new ForbiddenException('User not in your branch.');
      }
      if (dto.role && (dto.role === UserRoleEnum.SUPER_ADMIN || dto.role === UserRoleEnum.BRANCH_MANAGER)) {
        throw new BadRequestException('Cannot assign admin or manager roles.');
      }
      if (dto.allowedBranches !== undefined) {
        throw new BadRequestException('Cannot change branch assignments.');
      }
    }

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
    const originalIsActive = user.isActive;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await user.save();

    const changedFields: string[] = [];
    if (dto.name !== undefined) changedFields.push('name');
    if (dto.role !== undefined) changedFields.push('role');
    if (dto.allowedBranches !== undefined) changedFields.push('allowedBranches');
    if (dto.activeBranchId !== undefined) changedFields.push('activeBranchId');
    if (dto.isActive !== undefined) {
      changedFields.push('isActive');
      if (dto.isActive !== originalIsActive) {
        if (dto.isActive) {
          this.logger.log(`User activated — ${user.email}`);
        } else {
          this.logger.log(`User deactivated — ${user.email}`);
        }
      }
    }
    if (changedFields.length > 0) {
      this.logger.log(`User updated — ${user.email} | ${changedFields.join(', ')}`);
    }

    await Promise.all([
      this.redis.del(CACHE_KEYS.USER(id)),
      this.redis.del(CACHE_KEYS.USERS_LIST),
      this.redis.del(CACHE_KEYS.USER_SESSION(id)),
    ]);

    return this.userModel.findById(id).select('-password').lean();
  }

  async resetPassword(id: string, caller?: { role: string; activeBranchId: string }) {
    const user = await this.userModel.findById(id);
    if (!user) {
      this.logger.warn(`User not found — id: ${id}`);
      throw new NotFoundException('User not found.');
    }

    if (caller?.role === UserRoleEnum.BRANCH_MANAGER) {
      const branchIdStr = caller.activeBranchId?.toString();
      const userBranchIds = (user.allowedBranches || []).map((b: any) => b.toString());
      if (!userBranchIds.includes(branchIdStr)) {
        throw new ForbiddenException('User not in your branch.');
      }
    }

    const rawPassword = generatePassword();
    user.password = await bcrypt.hash(rawPassword, 12);
    user.passwordChangedAt = null;
    await user.save();

    await Promise.all([
      this.redis.del(CACHE_KEYS.USER(id)),
      this.redis.del(CACHE_KEYS.USER_SESSION(id)),
      this.redis.del(CACHE_KEYS.USERS_LIST),
    ]);

    this.logger.log(`Password reset — ${user.email} | generated by admin`);
    return { user: await this.userModel.findById(id).select('-password').lean(), generatedPassword: rawPassword };
  }
}

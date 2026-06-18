import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User, UserRoleEnum } from '../users/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../../config/cache.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private redisService: RedisService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      this.logger.warn(`Register failed — email already exists: ${dto.email}`);
      throw new BadRequestException('Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      name: dto.name,
      role: dto.role,
      allowedBranches: [],
    });

    this.logger.log(`User registered — ${user.email} | role: ${user.role}`);

    const token = this.signToken(user);
    return { accessToken: token, user: this.sanitize(user) };
  }

  async getProfileById(userId: string) {
    const user = await this.userModel.findById(userId, { password: 0 }).lean();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      passwordChangedAt: user.passwordChangedAt?.toISOString?.() ?? null,
      allowedBranches: user.allowedBranches.map((b: any) => b.toString()),
      activeBranchId: user.activeBranchId?.toString() || null,
    };
  }

  async login({ email, password}: LoginDto) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).select('+password');
    this.logger.debug(`User is ==>${user}`);
    if (!user) {
      this.logger.warn(`Login failed — unknown email: ${email}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      this.logger.warn(`Login blocked — deactivated account: ${email}`);
      throw new UnauthorizedException("Account Deactivated. Contact Admin.");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      this.logger.warn(`Login failed — wrong password: ${email}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.logger.log(`Login success — ${email} | role: ${user.role}`);

    const token = this.signToken(user);
    const sanitizedUser = this.sanitize(user);

    await this.redisService.set(CACHE_KEYS.USER(sanitizedUser.id), JSON.stringify(sanitizedUser));

    return { accessToken: token, user: sanitizedUser };
  }

  async switchBranch(userId: string, dto: SwitchBranchDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found.');

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact Support');
    }

    const branchStr = dto.branchId;
    const allowed = user.allowedBranches.map((b) => b.toString());

    if (!allowed.includes(branchStr) && user.role !== UserRoleEnum.SUPER_ADMIN) {
      this.logger.warn(`Branch switch denied — ${user.email} tried to access unassigned branch ${branchStr}`);
      throw new BadRequestException('You are not assigned to this branch.');
    }

    user.activeBranchId = dto.branchId as any;
    await user.save();

    this.logger.log(`Branch switched — ${user.email} → ${branchStr}`);

    await this.redisService.del(CACHE_KEYS.USER(userId));
    await this.redisService.del(CACHE_KEYS.USER_SESSION(userId));

    const token = this.signToken(user);
    return { accessToken: token, user: this.sanitize(user) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new UnauthorizedException('User not found.');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      this.logger.warn(`Password change failed — wrong current password: ${user.email}`);
      throw new BadRequestException('Current password is incorrect.');
    }

    if (newPassword === currentPassword) throw new BadRequestException('New password must be different from current password.');
    if (newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters.');

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();

    this.logger.log(`Password changed — ${user.email}`);

    await this.redisService.del(CACHE_KEYS.USER(userId));
    await this.redisService.del(CACHE_KEYS.USER_SESSION(userId));

    return { message: 'Password changed successfully.' };
  }

  async logout(userId: string) {
    this.logger.log(`User logged out — id: ${userId}`);
    await this.redisService.del(CACHE_KEYS.USER(userId));
    await this.redisService.del(CACHE_KEYS.USER_SESSION(userId));
  }

  private signToken(user: User) {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      isActive: user.isActive,
      allowedBranches: user.allowedBranches.map((b) => b.toString()),
      activeBranchId: user.activeBranchId?.toString(),
    };
    return this.jwtService.sign(payload);
  }

  private sanitize(user: User) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      passwordChangedAt: user.passwordChangedAt?.toISOString?.() ?? null,
      allowedBranches: user.allowedBranches.map((b) => b.toString()),
      activeBranchId: user.activeBranchId?.toString() || null,
    };
  }
}

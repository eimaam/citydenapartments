import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
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
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private redisService: RedisService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new BadRequestException('Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const userData = {
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      name: dto.name,
      role: dto.role,
      allowedBranches: [],
    }

    const user = await this.userModel.create(userData);

    const token = this.signToken(user);
    return { accessToken: token, user: this.sanitize(user) };
  }

  async getProfileById(userId){
    const user = await this.userModel.findById(userId).lean()
    if (!user){
      throw new NotFoundException("User not found")
    }
    return user;
  }

  async login({ email, password}: LoginDto) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = this.signToken(user);
    const sanitizedUser = this.sanitize(user)
    
    // cache
    await this.redisService.set(CACHE_KEYS.USER(sanitizedUser.id), JSON.stringify(sanitizedUser))

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
      throw new BadRequestException('You are not assigned to this branch.');
    }

    user.activeBranchId = dto.branchId as any;
    await user.save();

    await this.redisService.del(CACHE_KEYS.USER(userId));
    await this.redisService.del(CACHE_KEYS.USER_SESSION(userId));

    const token = this.signToken(user);
    return { accessToken: token, user: this.sanitize(user) };
  }

  async logout(userId: string) {
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
      allowedBranches: user.allowedBranches.map((b) => b.toString()),
      activeBranchId: user.activeBranchId?.toString() || null,
    };
  }
}

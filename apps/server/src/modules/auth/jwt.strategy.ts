import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../users/user.schema';
import { AppConfig } from '../../config/app.config';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.constants';

export interface JwtPayload {
  sub: string;
  role: string;
  isActive: boolean,
  allowedBranches: string[];
  activeBranchId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private redisService: RedisService,

  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, 
      secretOrKey: AppConfig.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; role: string; isActive: boolean; allowedBranches: string[]; activeBranchId?: string }) {
    const cacheKey = CACHE_KEYS.USER(payload.sub)
    const cachedUser = await this.redisService.get(cacheKey)
    if (cachedUser) {
      const user = JSON.parse(cachedUser)
      if (!user.isActive) {
        this.logger.warn(`JWT rejected — deactivated user: ${user.email}`);
        throw new UnauthorizedException("Account is deactivated. Contact Support")
      }
      return user;
    }



    
    
    const user = await this.userModel.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      this.logger.warn(`JWT rejected — user not found or deactivated user`);
      throw new UnauthorizedException('User not found or deactivated.');
    }

    const sanitizedUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      passwordChangedAt: user.passwordChangedAt?.toISOString?.() ?? null,
      allowedBranches: user.allowedBranches.map((b) => b.toString()),
      activeBranchId: user.activeBranchId?.toString() || null,
    };

    // save to cache for 1 hour
    await this.redisService.set(cacheKey, JSON.stringify(sanitizedUser), CACHE_TTL.LONG_TERM)

    return sanitizedUser
  }
}


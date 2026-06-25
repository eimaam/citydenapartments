import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DiscountCode } from './discount-code.schema';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';

const MAX_DISCOUNT_PCT: Record<string, number> = {
  FrontOfficeManager: 10,
  FacilityManager: 15,
  GroupGM: 50,
  SuperAdmin: 50,
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `DISC-${code}`;
}

@Injectable()
export class DiscountCodesService {
  private readonly logger = new Logger(DiscountCodesService.name);

  constructor(
    @InjectModel(DiscountCode.name) private discountCodeModel: Model<DiscountCode>,
  ) {}

  async generate(userRole: string, userId: string, dto: CreateDiscountCodeDto) {
    const maxPct = MAX_DISCOUNT_PCT[userRole];
    if (!maxPct) throw new ForbiddenException('Your role cannot generate discount codes.');
    if (dto.percentage > maxPct) throw new BadRequestException(`Max discount for your role is ${maxPct}%.`);
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) throw new BadRequestException('Expiry date cannot be in the past.');

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while (await this.discountCodeModel.findOne({ code }) && attempts < 10);

    return this.discountCodeModel.create({
      code,
      percentage: dto.percentage,
      // [multi-use] uncomment to restore maxUsage
      // maxUsage: dto.maxUsage,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      createdBy: userId,
    });
  }

  async findAll(query: { page?: number; limit?: number; isActive?: string; search?: string }) {
    const { page = 1, limit = 20, isActive, search } = query;
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.code = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.discountCodeModel.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.discountCodeModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const code = await this.discountCodeModel.findById(id).populate('createdBy', 'name email').lean();
    if (!code) throw new NotFoundException('Discount code not found.');
    return code;
  }

  async validate(codeStr: string) {
    const doc = await this.discountCodeModel.findOne({ code: codeStr }).lean();
    if (!doc) throw new NotFoundException('Discount code not found.');
    if (!doc.isActive) throw new BadRequestException('Discount code is deactivated.');
    if (doc.expiresAt && new Date() > doc.expiresAt) throw new BadRequestException('Discount code has expired.');
    // [multi-use] was: if (doc.maxUsage && doc.usedCount >= doc.maxUsage)
    if (doc.usedCount >= 1) throw new BadRequestException('Discount code has already been used.');

    return { code: doc.code, percentage: doc.percentage, _id: doc._id };
  }

  async consume(id: string) {
    const doc = await this.discountCodeModel.findById(id);
    if (!doc) throw new NotFoundException('Discount code not found.');
    doc.usedCount += 1;
    await doc.save();
    this.logger.log(`Discount code ${doc.code} consumed — used ${doc.usedCount}/1`);
  }

  async toggleActive(id: string) {
    const doc = await this.discountCodeModel.findById(id);
    if (!doc) throw new NotFoundException('Discount code not found.');
    doc.isActive = !doc.isActive;
    await doc.save();
    this.logger.log(`Discount code ${doc.code} ${doc.isActive ? 'activated' : 'deactivated'}`);
    return doc;
  }
}

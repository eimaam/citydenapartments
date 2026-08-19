import { InjectModel } from "@nestjs/mongoose";
import { RedisService } from "../redis/redis.service";
import { Branch } from "./branch.schema";
import { Model } from "mongoose";
import { CACHE_KEYS, CACHE_TTL } from "../../config/cache.constants";
import { NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { CreateBranchDto } from "./dto/create.dto";
import { BranchUpdateDto } from "./dto/update.dto";
import { escapeRegex } from "../../common/utils/escape-regex";



export class BranchService {
    private readonly logger = new Logger(BranchService.name);

    constructor(
        @InjectModel(Branch.name)
        private branchModel: Model<Branch>,
        private redisService: RedisService
    ) { }

    async getAll(params?: { page?: number; limit?: number; search?: string; filter?: any }) {
        const { page = 1, limit = 20, search, filter = {} } = params || {};
        if (search) {
            const escaped = escapeRegex(search);
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { code: { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.branchModel.find(filter).skip(skip).limit(limit).lean(),
            this.branchModel.countDocuments(filter),
        ]);

        return { items, total, page, limit };
    }

    async findOneById(branchId: string) {
        const cacheKey = CACHE_KEYS.BRANCH_DETAILS(branchId)
        let branch: any;
        const cachedBranch = await this.redisService.get(cacheKey)
        if (cachedBranch) {
            branch = JSON.parse(cachedBranch)
        } else {
            branch = await this.branchModel.findById(branchId).lean()

        }

        if (!branch) {
            throw new NotFoundException("Branch not found")
        }

        await this.redisService.set(CACHE_KEYS.BRANCH_DETAILS(branchId), JSON.stringify(branch))
        return branch;
    }

    async create(dto: CreateBranchDto) {
        const name = dto.name?.trim();
        const code = dto.code?.trim().toUpperCase();
        const address = dto.address?.trim();
        const city = dto.city ? dto.city.trim().toUpperCase() : '';
        const state = dto.state ? dto.state.trim().toUpperCase() : '';
        const { isActive, policies } = dto;

        const duplicate = await this.branchModel.findOne({
            $or: [{ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }, { code: code.toUpperCase() }],
        });
        if (duplicate) {
            this.logger.warn(`Duplicate branch name/code on create — ${name} (${code})`);
            throw new BadRequestException('A branch with this name or code already exists.');
        }

        const newBranch = await this.branchModel.create({
            name, address, city, state, code, isActive, policies
        });

        await this.redisService.invalidateDashboardCache();
        this.logger.log(`Branch created — ${name} (${code}) | address: ${address}, ${city}, ${state}`);

        return newBranch;
    }

    async update(branchId: string, dto: BranchUpdateDto) {
        const updateDetails: any = { ...dto };
        if (dto.name) updateDetails.name = dto.name.trim();
        if (dto.code) updateDetails.code = dto.code.trim().toUpperCase();
        if (dto.address) updateDetails.address = dto.address.trim();
        if (dto.city) updateDetails.city = dto.city.trim().toUpperCase();
        if (dto.state) updateDetails.state = dto.state.trim().toUpperCase();

        const updatedBranch = await this.branchModel.findByIdAndUpdate(branchId, updateDetails, { new: true });

        if (updatedBranch) {
            await this.redisService.del(CACHE_KEYS.BRANCH_DETAILS(branchId));
            await this.redisService.invalidateDashboardCache();
            this.logger.log(`Branch updated — ${updatedBranch.name} (${updatedBranch.code})`);
        }

        return updatedBranch;
    }
}
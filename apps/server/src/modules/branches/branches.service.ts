import { InjectModel } from "@nestjs/mongoose";
import { RedisService } from "../redis/redis.service";
import { Branch } from "./branch.schema";
import { Model } from "mongoose";
import { CACHE_KEYS, CACHE_TTL } from "../../config/cache.constants";
import { NotFoundException } from "@nestjs/common";
import { CreateBranchDto } from "./dto/create.dto";
import { BranchUpdateDto } from "./dto/update.dto";



export class BranchService {
    constructor(
        @InjectModel(Branch.name)
        private branchModel: Model<Branch>,
        private redisService: RedisService
    ) { }

    async getAll() {
        const branches = await this.branchModel.find().lean()

        // cache branches
        await this.redisService.set(CACHE_KEYS.BRANCHES, JSON.stringify(branches), CACHE_TTL.LONG_TERM)

        return branches
    }

    async findOneById(branchId: string) {
        const cacheKey = CACHE_KEYS.BRANCH_DETAILS(branchId)
        let branch: any;
        const cachedBranch = await this.redisService.get(cacheKey)
        if (cachedBranch) {
            branch = JSON.parse(cachedBranch)
        } else {
            const branch = await this.branchModel.findById(branchId).lean()

        }

        if (!branch) {
            throw new NotFoundException("Branch not found")
        }

        await this.redisService.set(CACHE_KEYS.BRANCH_DETAILS(branchId), JSON.stringify(branch))
        return branch;
    }

    async create(dto: CreateBranchDto) {
        const { name, address, code, isActive } = dto

        const newBranch = await this.branchModel.create({
            name, address, code, isActive
        })

        return newBranch;
    }

    async update(branchId: string, dto: BranchUpdateDto) {
        const updateDetails = {
            ...dto
        }
        const updatedBranch = this.branchModel.findByIdAndUpdate(branchId, updateDetails, { new: true })

        return updatedBranch;

    }
}
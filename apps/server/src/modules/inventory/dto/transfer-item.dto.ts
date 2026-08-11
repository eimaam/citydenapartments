import { IsMongoId, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class TransferItemDto {
  @IsMongoId()
  targetDepartmentId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * S-4: Proper DTO for a single booking coming from the frontend.
 * Replaces the `Record<string, unknown>` + `as never` casts that bypassed
 * NestJS's global ValidationPipe (forbidNonWhitelisted: true).
 */
export class FrontendSpaceAssignmentDto {
  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  primeSpaceId?: string;

  @IsOptional()
  @IsString()
  subSpaceId?: string;

  @IsOptional()
  @IsIn(["PRIME_FULL", "SUB_ONLY"])
  assignmentType?: "PRIME_FULL" | "SUB_ONLY";

  @IsOptional()
  @IsString()
  usageLabel?: string;

  @IsOptional()
  @IsNumber()
  guestCount?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class FrontendBookingDto {
  @IsString()
  id!: string;

  @IsString()
  venueId!: string;

  @IsString()
  status!: string;

  @IsString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  bookingSource?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  guestCount?: number;

  @IsOptional()
  @IsString()
  primeSpaceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primeSpaceIds?: string[];

  @IsOptional()
  @IsString()
  subSpaceId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FrontendSpaceAssignmentDto)
  spaceAssignments?: FrontendSpaceAssignmentDto[];

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  createdAt?: string;

  // Allow extra fields from the frontend payload (source-of-truth fields etc.)
  [key: string]: unknown;
}

export class SyncFrontendBookingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FrontendBookingDto)
  bookings!: FrontendBookingDto[];
}

export class CreateFrontendBookingBodyDto {
  @IsObject()
  @ValidateNested()
  @Type(() => FrontendBookingDto)
  booking!: FrontendBookingDto;
}

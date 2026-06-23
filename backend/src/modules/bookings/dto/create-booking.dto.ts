import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export const BOOKING_STATUSES = [
  "DRAFT",
  "PRICE_QUOTED",
  "TENTATIVE",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "LOST_SPACE_TAKEN",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export class CreateBookingDto {
  @IsString()
  @MinLength(4)
  bookingNumber!: string;

  @IsString()
  customerId!: string;

  @IsString()
  venueId!: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsEnum(BOOKING_STATUSES)
  status!: BookingStatusValue;

  @IsOptional()
  @IsEnum(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatusValue;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  bookingSource?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @Min(1)
  guestCount!: number;

  @IsDateString()
  eventDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balanceAmount?: number;
}

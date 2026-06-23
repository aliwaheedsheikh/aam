import { Allow, IsString } from "class-validator";

export class UpsertMasterDataDto {
  @IsString()
  key!: string;

  @Allow()
  value!: unknown;
}

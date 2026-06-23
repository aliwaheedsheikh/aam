import { Allow, IsString } from "class-validator";

export class UpsertAppStateDto {
  @IsString()
  key!: string;

  @Allow()
  value!: unknown;
}

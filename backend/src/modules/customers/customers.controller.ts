import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @RequirePermissions(MODULE_KEYS.customerDatabase, "view")
  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @RequirePermissions(MODULE_KEYS.customerDatabase, "view")
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @RequirePermissions(MODULE_KEYS.customerDatabase, "create")
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @RequirePermissions(MODULE_KEYS.customerDatabase, "edit")
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }
}

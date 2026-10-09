import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { RolesModule } from "../roles/roles.module";
import { UsersRepository } from "./repositories/users.repository";
import { UserRolesService } from "./services";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [UsersService, UserRolesService, UsersRepository, AuditService],
  exports: [UsersService, UserRolesService, UsersRepository],
})
export class UsersModule {}

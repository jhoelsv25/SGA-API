import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CacheModule } from "../../core/cache";
import { RolesRepository } from "./repositories/roles.repository";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [CacheModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, AuditService],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}

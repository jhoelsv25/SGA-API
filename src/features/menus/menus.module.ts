import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { MenusRepository } from "./repositories/menus.repository";
import { MenusController } from "./menus.controller";
import { MenusService } from "./menus.service";

@Module({
  controllers: [MenusController],
  providers: [MenusService, MenusRepository, AuditService],
  exports: [MenusService, MenusRepository],
})
export class MenusModule {}

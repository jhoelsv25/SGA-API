import { Module } from "@nestjs/common";
import { AuditModule } from "./audit";
import { AuthModule } from "./auth";
import { MenusModule } from "./menus";
import { RolesModule } from "./roles";
import { UsersModule } from "./users";

@Module({
  imports: [AuthModule, RolesModule, UsersModule, MenusModule, AuditModule],
  exports: [AuthModule, RolesModule, UsersModule, MenusModule, AuditModule],
})
export class FeaturesModule {}

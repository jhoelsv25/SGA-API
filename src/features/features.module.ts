import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { MenusModule } from "./menus";
import { RolesModule } from "./roles";
import { UsersModule } from "./users";

@Module({
  imports: [AuthModule, RolesModule, UsersModule, MenusModule],
  exports: [AuthModule, RolesModule, UsersModule, MenusModule],
})
export class FeaturesModule {}

import { Database } from "../../../../core/database";
import { personas, roles, usuarios } from "../../../../core/database/schema";
import { UserResponseDto } from "../../dto/user-response.dto";

export type UsersRepositoryDeps = {
  db: Database;
};

export type UsersRepositoryCalls = {
  mapUserResult: (row: {
    usuario: typeof usuarios.$inferSelect;
    persona: typeof personas.$inferSelect;
    rol: typeof roles.$inferSelect;
  }) => UserResponseDto;
  findUserById: (id: string) => Promise<UserResponseDto | null>;
};

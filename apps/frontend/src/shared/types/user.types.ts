import type { UserRoleEnum } from "@/shared/enums/user-role.enum";

export interface ICurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRoleEnum;
  companyId: string | null;
}

import { IsEnum } from "class-validator";
import { GroupRole } from "../enums/group-role.enum";

export class UpdateMemberRoleDto {
  @IsEnum(GroupRole)
  role: GroupRole;
}
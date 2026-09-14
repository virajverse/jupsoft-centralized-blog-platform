import { UserRoleAssignment } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  roles: string[];
  roleAssignments: UserRoleAssignment[];
}

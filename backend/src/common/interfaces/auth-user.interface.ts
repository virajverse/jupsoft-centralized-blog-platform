export interface UserRoleAssignment {
  id?: string;
  userId?: string;
  websiteId?: string | null;
  isGlobal?: boolean;
  role: string;
  createdAt?: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  roles: string[];
  roleAssignments: UserRoleAssignment[];
}

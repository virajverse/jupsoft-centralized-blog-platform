import React from 'react';
import { UserManagementView } from '../../../components/users/UserManagementView';

export const metadata = {
  title: 'Team & RBAC Permissions Matrix | Jupsoft CMS',
  description: 'Manage users, tenant-scoped role assignments, and role-based access control policies.',
};

export default function UsersPage() {
  return <UserManagementView />;
}

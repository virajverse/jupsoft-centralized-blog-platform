import React from 'react';
import { UserManagementView } from '../../../components/users/UserManagementView';

export const metadata = {
  title: 'Team Roles & Permissions | Jupsoft CMS',
  description: 'Manage users, website role assignments, and team permissions.',
};

export default function UsersPage() {
  return <UserManagementView />;
}

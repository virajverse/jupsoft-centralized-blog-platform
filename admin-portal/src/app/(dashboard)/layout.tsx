import React from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { DashboardLayoutSwitcher } from '../../components/layout/DashboardLayoutSwitcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardLayoutSwitcher>
        {children}
      </DashboardLayoutSwitcher>
    </AuthGuard>
  );
}

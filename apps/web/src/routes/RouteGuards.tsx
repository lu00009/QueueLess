import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, OrgRole } from '@queueless/shared-types';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const AdminRouteGuard: React.FC = () => {
  const { user, activeOrg, isLoading } = useAuth();

  if (isLoading) return null;

  const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN;
  const isOrgAdmin = activeOrg?.role === OrgRole.ORG_OWNER || activeOrg?.role === OrgRole.ORG_ADMIN;

  if (!isSystemAdmin && !isOrgAdmin) {
    return <Navigate to="/staff" replace />;
  }

  return <Outlet />;
};

export const StaffRouteGuard: React.FC = () => {
  const { user, activeOrg, isLoading } = useAuth();

  if (isLoading) return null;

  const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN;
  const hasStaffOrHigher =
    activeOrg?.role === OrgRole.ORG_STAFF ||
    activeOrg?.role === OrgRole.ORG_ADMIN ||
    activeOrg?.role === OrgRole.ORG_OWNER;

  if (!isSystemAdmin && !hasStaffOrHigher) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

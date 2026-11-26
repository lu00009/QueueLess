import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto, OrgRole, AuthTokensDto } from '@queueless/shared-types';
import { apiClient } from '../api/client';

interface OrgMembershipInfo {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
}

interface AuthContextType {
  user: UserDto | null;
  memberships: OrgMembershipInfo[];
  activeOrg: OrgMembershipInfo | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (tokens: AuthTokensDto) => void;
  logout: () => Promise<void>;
  setActiveOrgId: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [memberships, setMemberships] = useState<OrgMembershipInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgMembershipInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await apiClient.get('/auth/me');
      const data = res.data.data;
      setUser(data.user);
      setMemberships(data.memberships);

      const savedOrgId = localStorage.getItem('active_org_id');
      const found = data.memberships.find((m: OrgMembershipInfo) => m.organizationId === savedOrgId);
      if (found) {
        setActiveOrg(found);
        apiClient.defaults.headers.common['X-Organization-Id'] = found.organizationId;
      } else if (data.memberships.length > 0) {
        setActiveOrg(data.memberships[0]);
        localStorage.setItem('active_org_id', data.memberships[0].organizationId);
        apiClient.defaults.headers.common['X-Organization-Id'] = data.memberships[0].organizationId;
      }
    } catch (err) {
      console.warn('Session expired or invalid, logging out...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('active_org_id');
      setUser(null);
      setMemberships([]);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = (data: AuthTokensDto) => {
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setMemberships(data.memberships);

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

    if (data.memberships.length > 0) {
      setActiveOrg(data.memberships[0]);
      localStorage.setItem('active_org_id', data.memberships[0].organizationId);
      apiClient.defaults.headers.common['X-Organization-Id'] = data.memberships[0].organizationId;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('active_org_id');
      delete apiClient.defaults.headers.common['Authorization'];
      delete apiClient.defaults.headers.common['X-Organization-Id'];
      setUser(null);
      setMemberships([]);
      setActiveOrg(null);
      setAccessToken(null);
    }
  };

  const setActiveOrgId = (orgId: string) => {
    const found = memberships.find((m) => m.organizationId === orgId);
    if (found) {
      setActiveOrg(found);
      localStorage.setItem('active_org_id', found.organizationId);
      apiClient.defaults.headers.common['X-Organization-Id'] = found.organizationId;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeOrg,
        accessToken,
        isLoading,
        login,
        logout,
        setActiveOrgId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

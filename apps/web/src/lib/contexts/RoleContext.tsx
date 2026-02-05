'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserRoleContext } from '@/app/api/me/context/route';

const ACTIVE_ROLE_COOKIE = '__active_role';

interface RoleContextValue {
  loading: boolean;
  hasStaffRole: boolean;
  hasTenantRole: boolean;
  activeRole: 'staff' | 'tenant' | null;
  needsRoleSelection: boolean;
  effectiveRole: string | null;
  setActiveRole: (role: 'staff' | 'tenant') => void;
  clearActiveRole: () => void;
  refetch: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 14) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasStaffRole, setHasStaffRole] = useState(false);
  const [hasTenantRole, setHasTenantRole] = useState(false);
  const [effectiveRole, setEffectiveRole] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<'staff' | 'tenant' | null>(
    null
  );

  const fetchRoleContext = useCallback(async () => {
    if (!user) {
      setHasStaffRole(false);
      setHasTenantRole(false);
      setEffectiveRole(null);
      setActiveRoleState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/me/context');
      const data = await res.json();

      if (data.ok && data.data) {
        const ctx: UserRoleContext = data.data;
        setHasStaffRole(ctx.hasStaffRole);
        setHasTenantRole(ctx.hasTenantRole);
        setEffectiveRole(ctx.effectiveRole);

        // Read active role from cookie
        const savedRole = getCookie(ACTIVE_ROLE_COOKIE) as
          | 'staff'
          | 'tenant'
          | null;

        // Validate saved role against actual roles
        if (savedRole === 'staff' && ctx.hasStaffRole) {
          setActiveRoleState('staff');
        } else if (savedRole === 'tenant' && ctx.hasTenantRole) {
          setActiveRoleState('tenant');
        } else if (ctx.hasStaffRole && !ctx.hasTenantRole) {
          // Only staff role - auto-select
          setActiveRoleState('staff');
          setCookie(ACTIVE_ROLE_COOKIE, 'staff');
        } else if (ctx.hasTenantRole && !ctx.hasStaffRole) {
          // Only tenant role - auto-select
          setActiveRoleState('tenant');
          setCookie(ACTIVE_ROLE_COOKIE, 'tenant');
        } else {
          // Both roles or no roles - need selection
          setActiveRoleState(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch role context:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRoleContext();
    }
  }, [authLoading, fetchRoleContext]);

  const setActiveRole = useCallback((role: 'staff' | 'tenant') => {
    setActiveRoleState(role);
    setCookie(ACTIVE_ROLE_COOKIE, role);
  }, []);

  const clearActiveRole = useCallback(() => {
    setActiveRoleState(null);
    deleteCookie(ACTIVE_ROLE_COOKIE);
  }, []);

  const needsRoleSelection =
    hasStaffRole && hasTenantRole && activeRole === null;

  return (
    <RoleContext.Provider
      value={{
        loading: authLoading || loading,
        hasStaffRole,
        hasTenantRole,
        activeRole,
        needsRoleSelection,
        effectiveRole,
        setActiveRole,
        clearActiveRole,
        refetch: fetchRoleContext,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

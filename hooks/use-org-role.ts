import { useOrganization } from "@clerk/nextjs";

/**
 * Hook to check user's role within the current organization
 *
 * Clerk Organization Roles:
 * - org:admin - Full admin access
 * - org:member - Standard member access
 */
export function useOrgRole() {
  const { membership } = useOrganization();

  const isAdmin = membership?.role === "org:admin";
  const isMember = membership?.role === "org:member";
  const role = membership?.role;

  return {
    role,
    isAdmin,
    isMember,
    membership,
  };
}

/**
 * Hook to check if user is admin
 * Returns true for org:admin role
 */
export function useIsAdmin() {
  const { isAdmin } = useOrgRole();
  return isAdmin;
}

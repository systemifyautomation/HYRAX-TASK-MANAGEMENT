// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  TEAM_MEMBER: 'team_member',
};

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 3,
  [USER_ROLES.MANAGER]: 2,
  [USER_ROLES.TEAM_MEMBER]: 1,
};

// Role display names
export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.TEAM_MEMBER]: 'Team Member',
};

// Helper functions
export const isAdmin = (role) => {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.MANAGER;
};

export const isSuperAdmin = (role) => {
  return role === USER_ROLES.SUPER_ADMIN;
};

export const isManager = (role) => {
  return role === USER_ROLES.MANAGER;
};

export const isTeamMember = (role) => {
  return role === USER_ROLES.TEAM_MEMBER;
};

export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};

export const getAllRoles = () => {
  return Object.values(USER_ROLES);
};

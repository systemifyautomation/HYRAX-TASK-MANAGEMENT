// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  TEAM_MEMBER: 'team_member',
};

// Normalize role from webhook format to internal format
export const normalizeRole = (role) => {
  if (!role) return USER_ROLES.USER;
  const roleLower = role.toLowerCase().replace(/-/g, '_');
  
  // Map webhook roles to internal roles
  const roleMap = {
    'super_admin': USER_ROLES.SUPER_ADMIN,
    'admin': USER_ROLES.ADMIN,
    'manager': USER_ROLES.MANAGER,
    'user': USER_ROLES.USER,
    'team_member': USER_ROLES.TEAM_MEMBER,
  };
  
  return roleMap[roleLower] || USER_ROLES.USER;
};

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 5,
  [USER_ROLES.ADMIN]: 4,
  [USER_ROLES.MANAGER]: 3,
  [USER_ROLES.USER]: 2,
  [USER_ROLES.TEAM_MEMBER]: 1,
};

// Role display names
export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.USER]: 'User',
  [USER_ROLES.TEAM_MEMBER]: 'Team Member',
};

// Helper functions
export const isAdmin = (role) => {
  const normalized = normalizeRole(role);
  return normalized === USER_ROLES.SUPER_ADMIN || normalized === USER_ROLES.ADMIN || normalized === USER_ROLES.MANAGER;
};

export const isSuperAdmin = (role) => {
  const normalized = normalizeRole(role);
  return normalized === USER_ROLES.SUPER_ADMIN;
};

export const isManager = (role) => {
  const normalized = normalizeRole(role);
  return normalized === USER_ROLES.MANAGER || normalized === USER_ROLES.ADMIN || normalized === USER_ROLES.SUPER_ADMIN;
};

export const isTeamMember = (role) => {
  const normalized = normalizeRole(role);
  return normalized === USER_ROLES.TEAM_MEMBER;
};

export const hasPermission = (userRole, requiredRole) => {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);
  return ROLE_HIERARCHY[normalizedUserRole] >= ROLE_HIERARCHY[normalizedRequiredRole];
};

export const getRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || role;
};

export const getAllRoles = () => {
  return Object.values(USER_ROLES);
};

// Department constants
export const DEPARTMENTS = {
  MEDIA_BUYING: 'MEDIA BUYING',
  GRAPHIC_DESIGN: 'GRAPHIC DESIGN',
  VIDEO_EDITING: 'VIDEO EDITING',
};

// Helper to check department
export const isMediaBuyer = (department) => {
  return department?.trim().toUpperCase() === DEPARTMENTS.MEDIA_BUYING;
};

export const isGraphicDesigner = (department) => {
  return department?.trim().toUpperCase() === DEPARTMENTS.GRAPHIC_DESIGN;
};

export const isVideoEditor = (department) => {
  return department?.trim().toUpperCase() === DEPARTMENTS.VIDEO_EDITING;
};

export const isCreative = (department) => {
  return isGraphicDesigner(department) || isVideoEditor(department);
};

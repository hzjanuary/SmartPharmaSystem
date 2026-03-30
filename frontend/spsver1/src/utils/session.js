const SESSION_USER_KEY = 'sps_user';

const normalizeRole = (role) => {
  if (role === 'manager') return 'admin';
  return role || 'staff';
};

export const saveSessionUser = (user) => {
  if (!user) return;

  const payload = {
    ...user,
    role: normalizeRole(user.role),
    rawRole: user.role,
  };

  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(payload));
};

export const getSessionUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.username) return null;

    return {
      ...parsed,
      role: normalizeRole(parsed.rawRole || parsed.role),
    };
  } catch {
    return null;
  }
};

export const clearSessionUser = () => {
  localStorage.removeItem(SESSION_USER_KEY);
};

export const toBackendRole = (role) => {
  if (role === 'admin') return 'manager';
  return 'staff';
};

export const fromBackendRole = (role) => normalizeRole(role);

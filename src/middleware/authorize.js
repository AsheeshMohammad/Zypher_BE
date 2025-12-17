export const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.userClaims) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role, permissions, isActive } = req.userClaims;

    if (!isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Admin role has all permissions
    if (role === 'admin') {
      return next();
    }

    // Check if user has required permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(permission => 
        permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
          current: permissions
        });
      }
    }

    next();
  };
};
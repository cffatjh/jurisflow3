import { Request, Response, NextFunction } from 'express';
import { ROLE_PERMISSIONS, Permission } from '../config/permissions';

export const checkPermission = (requiredPermission: Permission) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // 1. Admin Override
        if (user.role === 'Admin') {
            return next();
        }

        // 2. Determine Effective Role
        // If user has an attached employee profile with a role, use that.
        // Otherwise fallback to the User.role (e.g. Partner)
        // Note: req.user is populated by verifyToken middleware. 
        // We assume verifyToken puts minimal info. We might need to fetch full user if role is not in token.
        // But usually token contains role. 
        // If token role is "Employee", we might need the specific employee role.

        // For now, let's assume the token has the correct specific role OR we trust the User.role map.
        // If token.role is generic "Employee", we have a problem. 
        // Let's assume the Login logic puts the SPECIFIC role in the token if possible, or we fetch it here.

        // Simplification: The role used is `user.role` from the token.
        // We should ensure Login puts the most specific role (e.g. PARALEGAL) into the token 
        // OR maps it to the user.role.

        const role = user.role;
        const permissions = ROLE_PERMISSIONS[role] || [];

        if (permissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
    };
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

declare global {
    namespace Express {
        interface Request {
            adminId?: string;
            clientId?: string;
            user?: any;
        }
    }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // Whitelist public endpoints
    if (
        req.path === '/login' ||
        req.path === '/client/login' ||
        req.path === '/health' ||
        req.path.startsWith('/auth/') ||
        req.path.startsWith('/client/') ||
        req.path.startsWith('/public/')
    ) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized - Token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.role !== 'Admin') {
            return res.status(403).json({
                message: 'Admin access required - Only users with Admin role can access this resource',
                userRole: user.role
            });
        }

        req.adminId = decoded.sub;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { verifyAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/auditLog';

const router = express.Router();

// ===================== PUBLIC / SHARED ROUTES =====================

// Get all clients (Protected by verifyToken in app.use)
router.get('/', async (req, res) => {
    try {
        const clients = await prisma.client.findMany();
        res.json(clients);
    } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ message: 'Failed to load clients' });
    }
});

// Create Client (Protected by verifyToken in app.use)
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Generate client number (CLT-0001 format)
        const lastClient = await prisma.client.findFirst({
            where: { clientNumber: { not: null } },
            orderBy: { clientNumber: 'desc' }
        });

        let nextNumber = 1;
        if (lastClient?.clientNumber) {
            const match = lastClient.clientNumber.match(/CLT-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        const clientNumber = `CLT-${nextNumber.toString().padStart(4, '0')}`;

        const created = await prisma.client.create({
            data: {
                clientNumber,
                name: data.name,
                email: data.email,
                phone: data.phone ?? null,
                mobile: data.mobile ?? null,
                company: data.company ?? null,
                type: data.type ?? 'Individual',
                status: data.status ?? 'Active',
                address: data.address ?? null,
                city: data.city ?? null,
                state: data.state ?? null,
                zipCode: data.zipCode ?? null,
                country: data.country ?? null,
                taxId: data.taxId ?? null,
                notes: data.notes ?? null,
            },
        });
        res.status(201).json(created);
    } catch (err) {
        console.error('Error creating client:', err);
        res.status(500).json({ message: 'Failed to create client' });
    }
});

// ===================== ADMIN ROUTES =====================

router.get('/admin/all', verifyAdmin, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(clients);
    } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ message: 'Failed to load clients' });
    }
});

router.put('/admin/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, email, phone, mobile, company, type, status,
            address, city, state, zipCode, country, taxId, notes,
            password, portalEnabled
        } = req.body;

        const updateData: any = {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone !== undefined && { phone }),
            ...(mobile !== undefined && { mobile }),
            ...(company !== undefined && { company }),
            ...(type && { type }),
            ...(status && { status }),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(zipCode !== undefined && { zipCode }),
            ...(country !== undefined && { country }),
            ...(taxId !== undefined && { taxId }),
            ...(notes !== undefined && { notes }),
            ...(portalEnabled !== undefined && { portalEnabled })
        };

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        // Get old client data for audit log
        const oldClient = await prisma.client.findUnique({ where: { id } });

        const client = await prisma.client.update({
            where: { id },
            data: updateData
        });

        // Get admin info for audit log
        const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

        // Log client update
        await createAuditLog({
            userId: req.adminId,
            userEmail: admin?.email || undefined,
            action: 'UPDATE',
            entityType: 'CLIENT',
            entityId: id,
            oldValues: oldClient ? {
                email: oldClient.email,
                name: oldClient.name,
                status: oldClient.status,
                portalEnabled: oldClient.portalEnabled,
            } : null,
            newValues: {
                email: client.email,
                name: client.name,
                status: client.status,
                portalEnabled: client.portalEnabled,
            },
            details: `Admin updated client: ${client.email}${password ? ' (password changed)' : ''}${portalEnabled !== undefined ? ` (portal ${portalEnabled ? 'enabled' : 'disabled'})` : ''}`,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.get('user-agent') || undefined,
        });

        res.json(client);
    } catch (err: any) {
        console.error('Error updating client:', err);
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Failed to update client' });
    }
});

router.delete('/admin/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get client data before deletion for audit log
        const deletedClient = await prisma.client.findUnique({ where: { id } });

        await prisma.client.delete({ where: { id } });

        // Get admin info for audit log
        const admin = await prisma.user.findUnique({ where: { id: req.adminId } });

        // Log client deletion
        await createAuditLog({
            userId: req.adminId,
            userEmail: admin?.email || undefined,
            action: 'DELETE',
            entityType: 'CLIENT',
            entityId: id,
            oldValues: deletedClient ? {
                email: deletedClient.email,
                name: deletedClient.name,
                status: deletedClient.status,
            } : null,
            details: `Admin deleted client: ${deletedClient?.email || id}`,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.get('user-agent') || undefined,
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting client:', err);
        res.status(500).json({ message: 'Failed to delete client' });
    }
});

export default router;

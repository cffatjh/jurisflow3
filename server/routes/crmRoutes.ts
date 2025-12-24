import express from 'express';
import { prisma } from '../db';
import { checkPermission } from '../middleware/rbac';

const router = express.Router();

// Conflict Check Endpoint
// Permissions: Anyone who can view clients/matters should probably be able to check conflicts, 
// or maybe restrict to staff. 'matter.create' seems appropriate since you check conflicts before taking a case.
router.get('/conflict-check', checkPermission('matter.create'), async (req, res) => {
    try {
        const query = req.query.q as string;
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        const q = query.toLowerCase();

        // 1. Search Clients (Name, Email, ClientNumber)
        const clientsPromise = prisma.client.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { clientNumber: { contains: q, mode: 'insensitive' } },
                    { company: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, clientNumber: true, email: true, type: true, status: true }
        });

        // 2. Search Leads
        const leadsPromise = prisma.lead.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { source: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, status: true, practiceArea: true }
        });

        // 3. Search Matters (Opposing parties logic would go here if structured, using basic match for now)
        // Note: Ideally Matters should have an 'opposingParty' field or Relation. 
        // Providing search on Matter Name for now.
        const mattersPromise = prisma.matter.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { caseNumber: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, caseNumber: true, status: true }
        });

        const [clients, leads, matters] = await Promise.all([clientsPromise, leadsPromise, mattersPromise]);

        const results = [
            ...clients.map(c => ({
                id: c.id,
                name: c.name,
                type: 'Client',
                detail: c.clientNumber || c.email,
                status: c.status
            })),
            ...leads.map(l => ({
                id: l.id,
                name: l.name,
                type: 'Lead',
                detail: l.practiceArea,
                status: l.status
            })),
            ...matters.map(m => ({
                id: m.id,
                name: m.name,
                type: 'Matter',
                detail: m.caseNumber,
                status: m.status
            }))
        ];

        res.json(results);
    } catch (err) {
        console.error('Error performing conflict check:', err);
        res.status(500).json({ message: 'Failed to perform conflict check' });
    }
});

// Move CRM/Leads related routes here later
// For now, focusing on the new feature

export default router;

import express from 'express';
import { prisma } from '../db';
import { checkPermission } from '../middleware/rbac';

const router = express.Router();

// ===================== MATTERS =====================

router.get('/', async (req, res) => {
    try {
        const matters = await prisma.matter.findMany({
            include: {
                client: true,
                timeEntries: true,
                expenses: true,
                tasks: true,
                events: true,
            },
        });
        res.json(matters);
    } catch (err) {
        console.error('Error fetching matters:', err);
        res.status(500).json({ message: 'Failed to load matters' });
    }
});

router.post('/', checkPermission('matter.create'), async (req, res) => {
    try {
        const data = req.body; // Partial<Matter>

        let clientId = data.clientId as string | undefined;

        // If matter is opened from a Lead, convert Lead -> Client first
        if (!clientId && data.sourceLeadId) {
            const lead = await prisma.lead.findUnique({ where: { id: data.sourceLeadId } });
            if (!lead) {
                return res.status(400).json({ message: 'Lead not found for conversion' });
            }

            const newClient = await prisma.client.create({
                data: {
                    name: lead.name,
                    email: data.clientEmail ?? '',
                    phone: data.clientPhone ?? null,
                    mobile: data.clientMobile ?? null,
                    company: data.clientCompany ?? null,
                    type: data.clientType ?? 'Individual',
                    status: 'Active',
                    address: data.clientAddress ?? null,
                    city: data.clientCity ?? null,
                    state: data.clientState ?? null,
                    zipCode: data.clientZipCode ?? null,
                    country: data.clientCountry ?? null,
                    taxId: data.clientTaxId ?? null,
                    notes: data.clientNotes ?? null,
                },
            });

            // Remove lead after conversion
            await prisma.lead.delete({ where: { id: lead.id } });
            clientId = newClient.id;
        }

        if (!clientId) {
            return res.status(400).json({ message: 'clientId is required to create a matter' });
        }

        const created = await prisma.matter.create({
            data: {
                caseNumber: data.caseNumber,
                name: data.name,
                practiceArea: data.practiceArea,
                status: data.status,
                feeStructure: data.feeStructure,
                openDate: data.openDate ? new Date(data.openDate) : undefined,
                responsibleAttorney: data.responsibleAttorney,
                billableRate: data.billableRate,
                trustBalance: data.trustBalance ?? 0,
                clientId,
            },
            include: { client: true },
        });
        res.status(201).json(created);
    } catch (err) {
        console.error('Error creating matter:', err);
        res.status(500).json({ message: 'Failed to create matter' });
    }
});

router.put('/:id', checkPermission('matter.edit'), async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const updated = await prisma.matter.update({
            where: { id },
            data: {
                name: data.name,
                caseNumber: data.caseNumber,
                practiceArea: data.practiceArea,
                status: data.status,
                feeStructure: data.feeStructure,
                billableRate: data.billableRate,
                trustBalance: data.trustBalance,
            },
            include: { client: true },
        });
        res.json(updated);
    } catch (err) {
        console.error('Error updating matter:', err);
        res.status(500).json({ message: 'Failed to update matter' });
    }
});

router.delete('/:id', checkPermission('matter.delete'), async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.matter.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting matter:', err);
        res.status(500).json({ message: 'Failed to delete matter' });
    }
});

export default router;

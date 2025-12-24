import express from 'express';
import { prisma } from '../db';

const router = express.Router();

// ===================== TASKS =====================

router.get('/tasks', async (req, res) => {
    try {
        const { matterId } = req.query;
        const user = req.user;

        const whereClause: any = matterId ? { matterId: matterId as string } : {};

        // Data Isolation: If not admin, only show own tasks
        if (user && user.role !== 'Admin' && user.id) {
            whereClause.userId = user.id;
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ message: 'Failed to load tasks' });
    }
});

router.post('/tasks', async (req, res) => {
    try {
        const data = req.body; // Partial<Task>
        const created = await prisma.task.create({
            data: {
                title: data.title,
                description: data.description ?? null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
                priority: data.priority,
                status: data.status,
                matterId: data.matterId ?? null,
                assignedTo: data.assignedTo ?? null,
                templateId: data.templateId ?? null,
                // @ts-ignore
                userId: req.user?.id || null, // Set owner
            },
        });
        res.status(201).json(created);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ message: 'Failed to create task' });
    }
});

router.put('/tasks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body; // Partial<Task>

        const updated = await prisma.task.update({
            where: { id },
            data: {
                title: data.title ?? undefined,
                description: data.description ?? undefined,
                dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
                reminderAt: data.reminderAt ? new Date(data.reminderAt) : data.reminderAt === null ? null : undefined,
                priority: data.priority ?? undefined,
                status: data.status ?? undefined,
                matterId: data.matterId === null ? null : data.matterId ?? undefined,
                assignedTo: data.assignedTo === null ? null : data.assignedTo ?? undefined,
                templateId: data.templateId === null ? null : data.templateId ?? undefined,
                completedAt: data.completedAt ? new Date(data.completedAt) : data.completedAt === null ? null : undefined,
            },
        });
        res.json(updated);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ message: 'Failed to update task' });
    }
});

router.put('/tasks/:id/status', async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const updated = await prisma.task.update({
            where: { id },
            data: {
                status,
                completedAt: status === 'Done' ? new Date() : null,
            },
        });
        res.json(updated);
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Failed to update task status' });
    }
});

router.delete('/tasks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.task.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ message: 'Failed to delete task' });
    }
});

// ===================== TASK TEMPLATES =====================
// Note: These might be better in a separate templateRoutes.ts if it grows, 
// but logically they are closely related to tasks.

router.get('/task-templates', async (req, res) => { // Changed path to strictly api/tasks/templates/list if mounted at /api/tasks
    // But wait, original was /api/task-templates. 
    // If I mount this at /api/tasks, then it becomes /api/tasks/templates/list
    // I should probably create a separate router or handle this carefully.
    // Let's stick to the original plan: move ALL logic.
    // Actually, keeping `task-templates` inside `taskRoutes` but accessible via `/api/task-templates` is tricky if mounted at `/api/tasks`.
    // Solution: I will EXPORT a separate router for templates OR just include them here but mount at root level in index.ts?
    // No, better to have `api/tasks` and `api/task-templates`.
    // I'll put them in here but logic needs to be mindful of mount point.
    // If I mount this file at `/api`, I can define both `/tasks` and `/task-templates`.
    // Let's try to keep it standard: `app.use('/api', taskRoutes)` where taskRoutes defines `/tasks` and `/task-templates`.

    try {
        const count = await prisma.taskTemplate.count();
        if (count === 0) {
            await prisma.taskTemplate.createMany({
                data: [
                    {
                        name: 'İcra Takibi (Basit)',
                        category: 'İcra',
                        description: 'İcra dosyası açılışından tebligat ve haciz aşamasına kadar temel görev listesi.',
                        definition: JSON.stringify({
                            defaults: { priority: 'Medium', status: 'To Do' },
                            tasks: [
                                { title: 'Dosya açılış evraklarını topla', offsetDays: 0, priority: 'High' },
                                { title: 'Borçlu adres/kimlik doğrulama', offsetDays: 0, priority: 'Medium' },
                                { title: 'Takip talebi hazırlama', offsetDays: 1, priority: 'High' },
                                { title: 'Ödeme emri tebligat takibi', offsetDays: 3, priority: 'Medium' },
                                { title: 'İtiraz kontrolü', offsetDays: 10, priority: 'High' },
                                { title: 'Haciz talebi hazırlığı', offsetDays: 14, priority: 'Medium' },
                            ],
                        }),
                    },
                    {
                        name: 'Dava Dosyası Açılış',
                        category: 'Genel',
                        description: 'Yeni matter açıldığında yapılacak temel checklist.',
                        definition: JSON.stringify({
                            defaults: { priority: 'Medium', status: 'To Do' },
                            tasks: [
                                { title: 'Vekalet / sözleşme kontrolü', offsetDays: 0, priority: 'High' },
                                { title: 'Müvekkil evraklarını yükle ve etiketle', offsetDays: 0, priority: 'Medium' },
                                { title: 'İlk strateji notu / yol haritası', offsetDays: 1, priority: 'Medium' },
                                { title: 'İlk duruşma/son tarihleri ajandaya ekle', offsetDays: 1, priority: 'High' },
                            ],
                        }),
                    },
                ],
            });
        }

        const templates = await prisma.taskTemplate.findMany({
            where: { isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(templates);
    } catch (err) {
        console.error('Error fetching task templates:', err);
        res.status(500).json({ message: 'Failed to load task templates' });
    }
});

router.post('/task-templates', async (req, res) => {
    try {
        const { name, category, description, definition, isActive } = req.body || {};
        if (!name || !definition) {
            return res.status(400).json({ message: 'name and definition are required' });
        }
        const created = await prisma.taskTemplate.create({
            data: {
                name,
                category: category ?? null,
                description: description ?? null,
                definition: typeof definition === 'string' ? definition : JSON.stringify(definition),
                isActive: isActive ?? true,
            },
        });
        res.status(201).json(created);
    } catch (err) {
        console.error('Error creating task template:', err);
        res.status(500).json({ message: 'Failed to create task template' });
    }
});

router.post('/tasks/from-template', async (req, res) => {
    try {
        const { templateId, matterId, assignedTo, baseDate } = req.body || {};
        if (!templateId) return res.status(400).json({ message: 'templateId is required' });

        const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
        if (!template) return res.status(404).json({ message: 'Template not found' });

        let parsed: any;
        try {
            parsed = JSON.parse(template.definition);
        } catch {
            return res.status(400).json({ message: 'Template definition is invalid JSON' });
        }

        const tasks: Array<any> = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
        const defaults = parsed?.defaults || {};
        const base = baseDate ? new Date(baseDate) : new Date();

        const created = await prisma.$transaction(
            tasks.map((t: any) => {
                const offsetDays = Number(t.offsetDays || 0);
                const due = new Date(base.getTime());
                due.setDate(due.getDate() + offsetDays);

                const reminderAt = t.reminderOffsetDays !== undefined
                    ? (() => {
                        const r = new Date(base.getTime());
                        r.setDate(r.getDate() + Number(t.reminderOffsetDays || 0));
                        return r;
                    })()
                    : null;

                return prisma.task.create({
                    data: {
                        title: t.title,
                        description: t.description ?? null,
                        dueDate: due,
                        reminderAt,
                        priority: t.priority || defaults.priority || 'Medium',
                        status: t.status || defaults.status || 'To Do',
                        matterId: matterId ?? null,
                        assignedTo: assignedTo ?? null,
                        templateId: templateId,
                    },
                });
            })
        );

        res.status(201).json({ template, tasks: created });
    } catch (err) {
        console.error('Error creating tasks from template:', err);
        res.status(500).json({ message: 'Failed to create tasks from template' });
    }
});

export default router;

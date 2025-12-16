import React, { useState, useEffect } from 'react';
import { Workflow as WorkflowIcon, Plus, Play, Pause, Trash2, Edit, Check, AlertCircle, Clock } from './Icons';
import { Workflow } from '../types';

const WorkflowBuilder: React.FC = () => {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger: 'matter_created',
        isActive: true,
        actions: [{ type: 'create_task', config: { title: '', priority: 'Medium' } }],
    });

    const triggerOptions = [
        { value: 'matter_created', label: 'Yeni Dava Açıldığında', icon: '📁' },
        { value: 'status_changed', label: 'Dava Durumu Değiştiğinde', icon: '🔄' },
        { value: 'deadline_approaching', label: 'Deadline Yaklaştığında', icon: '⏰' },
        { value: 'task_completed', label: 'Görev Tamamlandığında', icon: '✅' },
        { value: 'invoice_created', label: 'Fatura Oluşturulduğunda', icon: '💰' },
    ];

    const actionTypes = [
        { value: 'create_task', label: 'Görev Oluştur' },
        { value: 'send_email', label: 'E-posta Gönder' },
        { value: 'send_notification', label: 'Bildirim Gönder' },
        { value: 'update_status', label: 'Durumu Güncelle' },
    ];

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/workflows', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWorkflows(data);
            }
        } catch (error) {
            console.error('Error fetching workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingWorkflow ? `/api/workflows/${editingWorkflow.id}` : '/api/workflows';
        const method = editingWorkflow ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setShowForm(false);
                setEditingWorkflow(null);
                setFormData({
                    name: '',
                    description: '',
                    trigger: 'matter_created',
                    isActive: true,
                    actions: [{ type: 'create_task', config: { title: '', priority: 'Medium' } }],
                });
                fetchWorkflows();
            }
        } catch (error) {
            console.error('Error saving workflow:', error);
        }
    };

    const toggleWorkflowActive = async (workflow: any) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/workflows/${workflow.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !workflow.isActive }),
            });
            fetchWorkflows();
        } catch (error) {
            console.error('Error toggling workflow:', error);
        }
    };

    const deleteWorkflow = async (id: string) => {
        if (!confirm('Bu workflow\'u silmek istediğinize emin misiniz?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/workflows/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            fetchWorkflows();
        } catch (error) {
            console.error('Error deleting workflow:', error);
        }
    };

    const addAction = () => {
        setFormData({
            ...formData,
            actions: [...formData.actions, { type: 'create_task', config: { title: '', priority: 'Medium' } }],
        });
    };

    const removeAction = (index: number) => {
        setFormData({
            ...formData,
            actions: formData.actions.filter((_, i) => i !== index),
        });
    };

    const updateAction = (index: number, field: string, value: any) => {
        const newActions = [...formData.actions];
        if (field === 'type') {
            newActions[index] = { type: value, config: {} };
        } else {
            newActions[index].config[field] = value;
        }
        setFormData({ ...formData, actions: newActions });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Otomasyon İş Akışları</h2>
                        <p className="text-gray-600 mt-1">Tekrarlayan işleri otomatikleştirin</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Workflow
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingWorkflow ? 'Workflow Düzenle' : 'Yeni Workflow Oluştur'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Workflow adı"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tetikleyici</label>
                                    <select
                                        value={formData.trigger}
                                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        {triggerOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Bu workflow ne yapar?"
                                />
                            </div>

                            {/* Actions */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Aksiyonlar</label>
                                    <button
                                        type="button"
                                        onClick={addAction}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        + Aksiyon Ekle
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.actions.map((action, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <select
                                                value={action.type}
                                                onChange={(e) => updateAction(index, 'type', e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                {actionTypes.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            {action.type === 'create_task' && (
                                                <input
                                                    type="text"
                                                    value={action.config.title || ''}
                                                    onChange={(e) => updateAction(index, 'title', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Görev başlığı"
                                                />
                                            )}
                                            {action.type === 'send_notification' && (
                                                <input
                                                    type="text"
                                                    value={action.config.message || ''}
                                                    onChange={(e) => updateAction(index, 'message', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Bildirim mesajı"
                                                />
                                            )}
                                            {formData.actions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeAction(index)}
                                                    className="p-1 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingWorkflow(null); }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Workflows List */}
                {workflows.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <WorkflowIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz workflow yok</h3>
                        <p className="text-gray-500 mb-4">İş süreçlerinizi otomatikleştirmek için yeni bir workflow oluşturun.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            İlk Workflow'unuzu Oluşturun
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {workflows.map((workflow) => {
                            const trigger = triggerOptions.find(t => t.value === workflow.trigger);
                            const actions = typeof workflow.actions === 'string' ? JSON.parse(workflow.actions) : workflow.actions;

                            return (
                                <div key={workflow.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${workflow.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                {trigger?.icon || '⚙️'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {workflow.isActive ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">{workflow.description || trigger?.label}</p>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                                    <span>{actions?.length || 0} aksiyon</span>
                                                    <span>•</span>
                                                    <span>{workflow.runCount || 0} kez çalıştı</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleWorkflowActive(workflow)}
                                                className={`p-2 rounded-lg transition-colors ${workflow.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={workflow.isActive ? 'Durdur' : 'Başlat'}
                                            >
                                                {workflow.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingWorkflow(workflow);
                                                    setFormData({
                                                        name: workflow.name,
                                                        description: workflow.description || '',
                                                        trigger: workflow.trigger,
                                                        isActive: workflow.isActive,
                                                        actions: actions || [],
                                                    });
                                                    setShowForm(true);
                                                }}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => deleteWorkflow(workflow.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowBuilder;

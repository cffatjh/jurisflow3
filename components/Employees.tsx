import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Mail, Phone, Calendar, Clock, CheckSquare, RefreshCw } from './Icons';
import { Can } from './common/Can';
import { ConfirmDialog } from './common/ConfirmDialog';
import { toast } from './Toast';
import { Employee, EmployeeRole, EmployeeStatus } from '../types';
import { api } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';

const Employees: React.FC = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('all');

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobile: '',
        role: 'SECRETARY' as EmployeeRole,
        hireDate: new Date().toISOString().split('T')[0],
        hourlyRate: '',
        salary: '',
        notes: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        password: ''
    });

    const roleLabels: Record<EmployeeRole, string> = {
        SECRETARY: t('role_secretary') || 'Sekreter',
        PARALEGAL: t('role_paralegal') || 'Paralegal',
        INTERN_LAWYER: t('role_intern_lawyer') || 'Stajyer Avukat',
        ACCOUNTANT: t('role_accountant') || 'Muhasebeci',
        ATTORNEY: t('role_attorney') || 'Avukat'
    };

    const roleIcons: Record<EmployeeRole, string> = {
        SECRETARY: '👩‍💼',
        PARALEGAL: '📋',
        INTERN_LAWYER: '⚖️',
        ACCOUNTANT: '💰',
        ATTORNEY: '👨‍⚖️'
    };

    const statusLabels: Record<EmployeeStatus, string> = {
        ACTIVE: t('status_active') || 'Aktif',
        ON_LEAVE: t('status_on_leave') || 'İzinli',
        TERMINATED: t('status_terminated') || 'İşten Ayrıldı'
    };

    const statusColors: Record<EmployeeStatus, string> = {
        ACTIVE: 'bg-green-100 text-green-800',
        ON_LEAVE: 'bg-yellow-100 text-yellow-800',
        TERMINATED: 'bg-red-100 text-red-800'
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const data = await api.getEmployees();
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                const updateData = {
                    ...formData,
                    hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
                    salary: formData.salary ? parseFloat(formData.salary) : undefined
                };
                await api.updateEmployee(editingEmployee.id, updateData);
                toast.success('Çalışan başarıyla güncellendi.');
            } else {
                const createData = {
                    ...formData,
                    hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
                    salary: formData.salary ? parseFloat(formData.salary) : undefined
                };
                const res = await api.createEmployee(createData);
                if (res && res.tempPassword) {
                    alert(`Çalışan başarıyla oluşturuldu.\n\nGEÇİCİ ŞİFRE: ${res.tempPassword}\n\nLütfen bu şifreyi çalışanla paylaşın. Bu şifre tekrar görüntülenemez.`);
                }
                toast.success('Çalışan başarıyla eklendi.');
            }
            setShowForm(false);
            setEditingEmployee(null);
            resetForm();
            fetchEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error('Çalışan kaydedilirken hata oluştu');
        }
    };

    const handleDeleteClick = (id: string) => {
        setEmployeeToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;

        try {
            await api.deleteEmployee(employeeToDelete);
            toast.success('Çalışan başarıyla silindi.');
            fetchEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error('Çalışan silinemedi. Lütfen tekrar deneyin.');
        } finally {
            setDeleteConfirmOpen(false);
            setEmployeeToDelete(null);
        }
    };

    const handleResetPassword = async (id: string) => {
        try {
            const result = await api.resetEmployeePassword(id);
            if (result?.tempPassword) {
                alert(`Geçici şifre: ${result.tempPassword}\nBu şifreyi çalışanla paylaşın.`);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            mobile: '',
            role: EmployeeRole.SECRETARY,
            hireDate: new Date().toISOString().split('T')[0],
            hourlyRate: '',
            salary: '',
            notes: '',
            address: '',
            emergencyContact: '',
            emergencyPhone: '',
            password: ''
        });
    };

    const openEditForm = (emp: Employee) => {
        setEditingEmployee(emp);
        setFormData({
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone || '',
            mobile: emp.mobile || '',
            role: emp.role,
            hireDate: emp.hireDate?.split('T')[0] || '',
            hourlyRate: emp.hourlyRate?.toString() || '',
            salary: emp.salary?.toString() || '',
            notes: emp.notes || '',
            address: emp.address || '',
            emergencyContact: emp.emergencyContact || '',
            emergencyPhone: emp.emergencyPhone || '',
            password: ''
        });
        setShowForm(true);
    };

    const filteredEmployees = selectedRole === 'all'
        ? employees
        : employees.filter(e => e.role === selectedRole);

    const roleCounts = employees.reduce((acc, e) => {
        acc[e.role] = (acc[e.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{t('employees_title') || 'Çalışan Yönetimi'}</h2>
                        <p className="text-gray-600 mt-1">{t('employees_subtitle') || 'Sekreter, stajyer ve diğer personeli yönetin.'}</p>
                    </div>
                    <Can perform="user.manage">
                        <button
                            onClick={() => { setShowForm(true); setEditingEmployee(null); resetForm(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            {t('add_employee') || '+ Çalışan Ekle'}
                        </button>
                    </Can>
                </div>

                {/* Role Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {Object.entries(roleLabels).map(([role, label]) => (
                        <button
                            key={role}
                            onClick={() => setSelectedRole(selectedRole === role ? 'all' : role)}
                            className={`p-4 rounded-xl border transition-all ${selectedRole === role
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{roleIcons[role as EmployeeRole]}</span>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">{label}</p>
                                    <p className="text-sm text-gray-500">{roleCounts[role] || 0} kişi</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold">
                                    {editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
                                </h3>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('first_name') || 'Ad'} *</label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('last_name') || 'Soyad'} *</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                            disabled={!!editingEmployee}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Object.entries(roleLabels).map(([val, lbl]) => (
                                                <option key={val} value={val}>{lbl}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cep Telefonu</label>
                                        <input
                                            type="tel"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('hire_date') || 'İşe Başlama'}</label>
                                        <input
                                            type="date"
                                            value={formData.hireDate}
                                            onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('salary') || 'Maaş'}</label>
                                        <input
                                            type="number"
                                            value={formData.salary}
                                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="₺"
                                        />
                                    </div>
                                </div>

                                {!editingEmployee && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">İlk Şifre</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Boş bırakılırsa otomatik oluşturulur"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('emergency_contact') || 'Acil Durum Kişisi'}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={formData.emergencyContact}
                                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="İsim"
                                        />
                                        <input
                                            type="tel"
                                            value={formData.emergencyPhone}
                                            onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Telefon"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingEmployee(null); }}
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
                    </div>
                )}

                {/* Employee List */}
                {filteredEmployees.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_employees') || 'Henüz çalışan yok'}</h3>
                        <p className="text-gray-500 mb-4">Ofisinize çalışan ekleyerek başlayın.</p>
                        <button
                            onClick={() => { setShowForm(true); resetForm(); }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            {t('add_first_employee') || 'İlk Çalışanı Ekle'}
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-gray-900">{emp.firstName} {emp.lastName}</h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[emp.status]}`}>
                                                    {statusLabels[emp.status]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    {roleIcons[emp.role]} {roleLabels[emp.role]}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-4 h-4" /> {emp.email}
                                                </span>
                                                {emp.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-4 h-4" /> {emp.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Can perform="user.manage">
                                            <button
                                                onClick={() => handleResetPassword(emp.id)}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title={t('reset_password') || 'Şifre Sıfırla'}
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openEditForm(emp)}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(emp.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </Can>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title="Çalışanı Sil"
                message="Bu çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmLabel="Evet, Sil"
                cancelLabel="İptal"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
            />
        </div>
    );
};

export default Employees;

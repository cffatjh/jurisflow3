import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, Check, AlertCircle } from '../Icons';
import { AppointmentRequest } from '../../types';

interface ClientAppointmentsProps {
    clientId: string;
}

const ClientAppointments: React.FC<ClientAppointmentsProps> = ({ clientId }) => {
    const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        requestedDate: '',
        requestedTime: '10:00',
        duration: 30,
        type: 'consultation' as const,
        notes: '',
    });

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('clientToken');
            const res = await fetch('/api/client/appointments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('clientToken');
        const dateTime = new Date(`${formData.requestedDate}T${formData.requestedTime}`);

        try {
            const res = await fetch('/api/client/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestedDate: dateTime.toISOString(),
                    duration: formData.duration,
                    type: formData.type,
                    notes: formData.notes,
                }),
            });

            if (res.ok) {
                setShowForm(false);
                setFormData({ requestedDate: '', requestedTime: '10:00', duration: 30, type: 'consultation', notes: '' });
                fetchAppointments();
            }
        } catch (error) {
            console.error('Error creating appointment:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'consultation': return '💼';
            case 'meeting': return '🤝';
            case 'call': return '📞';
            case 'court': return '⚖️';
            default: return '📅';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Randevu Taleplerim</h2>
                        <p className="text-gray-600 mt-1">Avukatınızdan randevu talep edin</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Randevu Talebi
                    </button>
                </div>

                {/* New Appointment Form */}
                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Yeni Randevu Talebi</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                                    <input
                                        type="date"
                                        value={formData.requestedDate}
                                        onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                                    <input
                                        type="time"
                                        value={formData.requestedTime}
                                        onChange={(e) => setFormData({ ...formData, requestedTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Randevu Türü</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="consultation">Danışmanlık</option>
                                        <option value="meeting">Toplantı</option>
                                        <option value="call">Telefon Görüşmesi</option>
                                        <option value="court">Duruşma</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika)</label>
                                    <select
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={15}>15 dakika</option>
                                        <option value={30}>30 dakika</option>
                                        <option value={45}>45 dakika</option>
                                        <option value={60}>1 saat</option>
                                        <option value={90}>1.5 saat</option>
                                        <option value={120}>2 saat</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar (opsiyonel)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Randevu ile ilgili notlarınız..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Talep Gönder
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Appointments List */}
                {appointments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz randevu talebiniz yok</h3>
                        <p className="text-gray-500 mb-4">Avukatınızdan randevu talep etmek için yukarıdaki butonu kullanın.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            İlk Randevunuzu Talep Edin
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((appointment) => (
                            <div key={appointment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="text-3xl">{getTypeIcon(appointment.type)}</div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-gray-900 capitalize">
                                                    {appointment.type === 'consultation' && 'Danışmanlık'}
                                                    {appointment.type === 'meeting' && 'Toplantı'}
                                                    {appointment.type === 'call' && 'Telefon Görüşmesi'}
                                                    {appointment.type === 'court' && 'Duruşma'}
                                                </h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                                                    {appointment.status === 'pending' && 'Beklemede'}
                                                    {appointment.status === 'approved' && 'Onaylandı'}
                                                    {appointment.status === 'rejected' && 'Reddedildi'}
                                                    {appointment.status === 'cancelled' && 'İptal Edildi'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(appointment.requestedDate)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {appointment.duration} dakika
                                                </span>
                                            </div>
                                            {appointment.notes && (
                                                <p className="mt-2 text-sm text-gray-500">{appointment.notes}</p>
                                            )}
                                            {appointment.approvedDate && appointment.status === 'approved' && (
                                                <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                                                    <Check className="w-4 h-4" />
                                                    Onaylanan tarih: {formatDate(appointment.approvedDate)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientAppointments;

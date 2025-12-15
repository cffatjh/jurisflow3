import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { AuditLogEntry, AuditLogListResponse } from '../types';
import { Search, X, FileText, BarChart3, RefreshCw } from './Icons';
import { toast } from './Toast';

type Filters = {
  q: string;
  action: string;
  entityType: string;
  email: string;
  from: string;
  to: string;
};

const formatIsoLocalInput = (d: Date) => {
  // yyyy-MM-ddTHH:mm for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    const needs = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needs ? `"${escaped}"` : escaped;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const AdminAuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatIsoLocalInput(d);
  }, []);

  const [draftFilters, setDraftFilters] = useState<Filters>({
    q: '',
    action: '',
    entityType: '',
    email: '',
    from: defaultFrom,
    to: ''
  });
  const [filters, setFilters] = useState<Filters>(draftFilters);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const load = async (pageToLoad: number, f: Filters) => {
    setLoading(true);
    try {
      const res = await api.admin.getAuditLogs({
        page: pageToLoad,
        limit: 50,
        q: f.q || undefined,
        action: f.action || undefined,
        entityType: f.entityType || undefined,
        email: f.email || undefined,
        from: f.from ? new Date(f.from).toISOString() : undefined,
        to: f.to ? new Date(f.to).toISOString() : undefined,
      });
      if (res === null) {
        toast.error('Yetkiniz yok (401). Lütfen tekrar giriş yapın.');
        setData(null);
        return;
      }
      setData(res as AuditLogListResponse);
    } catch (e: any) {
      console.error('Audit logs load error:', e);
      toast.error(e?.message || 'Audit loglar yüklenemedi');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const items = data?.items ?? [];

  // Compute statistics from current items
  const stats = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};

    items.forEach(item => {
      // Count by action
      actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
      // Count by entity type
      entityCounts[item.entityType] = (entityCounts[item.entityType] || 0) + 1;
      // Count by actor
      const actor = item.userEmail || item.clientEmail || 'Unknown';
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    });

    // Get top actions
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Get top entities
    const topEntities = Object.entries(entityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Get most active user
    const topActor = Object.entries(actorCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // Today's activity count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = items.filter(i => new Date(i.createdAt) >= today).length;

    return {
      total: data?.total ?? 0,
      todayCount,
      topActions,
      topEntities,
      topActor: topActor ? { email: topActor[0], count: topActor[1] } : null,
      uniqueActors: Object.keys(actorCounts).length,
    };
  }, [items, data?.total]);

  const handleApplyFilters = () => {
    setPage(1);
    setFilters(draftFilters);
  };

  const handleReset = () => {
    const next: Filters = {
      q: '',
      action: '',
      entityType: '',
      email: '',
      from: defaultFrom,
      to: ''
    };
    setDraftFilters(next);
    setPage(1);
    setFilters(next);
  };

  const handleExport = () => {
    if (!items.length) {
      toast.warning('Export için kayıt bulunamadı.');
      return;
    }
    const rows = items.map((i) => ({
      createdAt: i.createdAt,
      action: i.action,
      entityType: i.entityType,
      entityId: i.entityId ?? '',
      actor: i.userEmail || i.clientEmail || '',
      actorType: i.userEmail ? 'user' : i.clientEmail ? 'client' : '',
      details: i.details ?? '',
      ipAddress: i.ipAddress ?? '',
    }));
    downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-slate-900">Aktivite Logları</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900"
            >
              CSV Export
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div className="p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-primary-600 uppercase">Total Logs</div>
                <div className="text-2xl font-bold text-primary-900 mt-1">{stats.total.toLocaleString()}</div>
              </div>
              <BarChart3 className="w-8 h-8 text-primary-400" />
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-600 uppercase">Today</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.todayCount}</div>
              </div>
              <RefreshCw className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
            <div>
              <div className="text-xs font-bold text-amber-600 uppercase">Top Action</div>
              <div className="text-lg font-bold text-amber-900 mt-1">
                {stats.topActions[0]?.[0] || 'N/A'}
              </div>
              <div className="text-xs text-amber-600">
                {stats.topActions[0]?.[1] || 0} occurrences
              </div>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
            <div>
              <div className="text-xs font-bold text-indigo-600 uppercase">Most Active</div>
              <div className="text-sm font-bold text-indigo-900 mt-1 truncate" title={stats.topActor?.email}>
                {stats.topActor?.email || 'N/A'}
              </div>
              <div className="text-xs text-indigo-600">
                {stats.topActor?.count || 0} actions
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              value={draftFilters.q}
              onChange={(e) => setDraftFilters((s) => ({ ...s, q: e.target.value }))}
              placeholder="Ara: action/entity/details/email/ip..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <input
            value={draftFilters.action}
            onChange={(e) => setDraftFilters((s) => ({ ...s, action: e.target.value }))}
            placeholder="Action (LOGIN/CREATE/...)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
          />
          <input
            value={draftFilters.entityType}
            onChange={(e) => setDraftFilters((s) => ({ ...s, entityType: e.target.value }))}
            placeholder="Entity (USER/DOCUMENT/...)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
          />
          <input
            value={draftFilters.email}
            onChange={(e) => setDraftFilters((s) => ({ ...s, email: e.target.value }))}
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900"
            >
              Uygula
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="Sıfırla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">From</label>
            <input
              type="datetime-local"
              value={draftFilters.from}
              onChange={(e) => setDraftFilters((s) => ({ ...s, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">To</label>
            <input
              type="datetime-local"
              value={draftFilters.to}
              onChange={(e) => setDraftFilters((s) => ({ ...s, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tarih</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Details</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((i) => (
                <tr
                  key={i.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelected(i)}
                >
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(i.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {i.userEmail || i.clientEmail || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-800">
                      {i.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="font-semibold">{i.entityType}</div>
                    <div className="text-xs text-gray-500">{i.entityId || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[420px] truncate">
                    {i.details || ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {i.ipAddress || ''}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Toplam: <span className="font-bold text-gray-700">{data?.total ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Önceki
          </button>
          <div className="text-sm text-gray-600">
            {page} / {totalPages}
          </div>
          <button
            disabled={loading || (data ? page >= totalPages : true)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900">Log Detayı</h4>
                <p className="text-xs text-gray-500">
                  {new Date(selected.createdAt).toLocaleString()} • {selected.action} • {selected.entityType}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Actor</div>
                <div className="text-sm text-gray-800">{selected.userEmail || selected.clientEmail || '-'}</div>
                <div className="text-xs text-gray-500 mt-1">{selected.userAgent || ''}</div>
                <div className="text-xs text-gray-500 mt-1 font-mono">{selected.ipAddress || ''}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Entity</div>
                <div className="text-sm text-gray-800">{selected.entityType}</div>
                <div className="text-xs text-gray-500 mt-1 font-mono">{selected.entityId || ''}</div>
                <div className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{selected.details || ''}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-1">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Old Values</div>
                <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-3 overflow-auto max-h-64">
                  {JSON.stringify(selected.oldValues ?? selected.oldValuesRaw ?? null, null, 2)}
                </pre>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-1">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">New Values</div>
                <pre className="text-xs bg-gray-50 border border-gray-100 rounded p-3 overflow-auto max-h-64">
                  {JSON.stringify(selected.newValues ?? selected.newValuesRaw ?? null, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



import React, { useEffect, useState } from 'react';
import { Task, TaskStatus, TaskOutcome } from '../types';
import { CheckSquare, Plus, Filter, X, Trash2, Archive } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useConfirm } from './ConfirmDialog';
import { toast } from './Toast';

const Tasks: React.FC = () => {
  const { t, formatDate } = useTranslation();
  const { tasks, addTask, updateTaskStatus, updateTask, deleteTask, archiveTask, matters, taskTemplates, createTasksFromTemplate } = useData();
  const { confirm } = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskMatterId, setNewTaskMatterId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];

  // Deep-link from Command Palette
  useEffect(() => {
    const targetId = localStorage.getItem('cmd_target_task');
    if (!targetId) return;
    const exists = tasks.some(t => t.id === targetId);
    if (exists) {
      setHighlightTaskId(targetId);
      setTimeout(() => setHighlightTaskId(null), 4000);
      localStorage.removeItem('cmd_target_task');
    }
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    addTask({
      id: `tsk${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDescription || undefined,
      priority: newTaskPriority,
      status: 'To Do',
      dueDate: (newTaskDueDate ? new Date(newTaskDueDate).toISOString() : new Date().toISOString()),
      matterId: newTaskMatterId,
      assignedTo: 'ME' // Self assigned for demo
    });
    setShowModal(false);
    setNewTaskTitle('');
    setNewTaskMatterId('');
    setNewTaskDueDate('');
    setNewTaskDescription('');
  };

  // Template Modal State
  const [templateId, setTemplateId] = useState('');
  const [templateMatterId, setTemplateMatterId] = useState('');
  const [templateAssignedTo, setTemplateAssignedTo] = useState('');
  const [templateBaseDate, setTemplateBaseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;
    await createTasksFromTemplate({
      templateId,
      matterId: templateMatterId || undefined,
      assignedTo: templateAssignedTo || undefined,
      baseDate: templateBaseDate ? new Date(templateBaseDate).toISOString() : undefined,
    });
    setShowTemplateModal(false);
    setTemplateId('');
    setTemplateMatterId('');
    setTemplateAssignedTo('');
    setTemplateBaseDate(new Date().toISOString().slice(0, 10));
  };

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tasks_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('tasks_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-white border border-gray-200 text-slate-700 px-5 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            title="Create tasks from a workflow template"
          >
            Şablon
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('add_task')}
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-[1000px]">
          {COLUMNS.map(column => {
            const colTasks = tasks.filter(t => t.status === column);
            return (
              <div key={column} className="flex-1 flex flex-col min-w-[280px] bg-gray-100/50 rounded-xl border border-gray-200/50 h-full max-h-full">
                <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                  <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column === 'Done' ? 'bg-green-500' : column === 'To Do' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>
                    {column}
                  </h3>
                  <span className="text-xs font-bold bg-white px-2 py-1 rounded text-gray-500 border border-gray-100">{colTasks.length}</span>
                </div>

                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {colTasks.map(task => {
                    const matter = matters.find(m => m.id === task.matterId);
                    return (
                      <div
                        key={task.id}
                        className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-all ${highlightTaskId === task.id ? 'ring-2 ring-indigo-400 border-indigo-200' : ''
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.assignedTo && (
                            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                              {task.assignedTo}
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1">{task.title}</h4>
                        {matter && <p className="text-xs text-blue-600 font-medium mb-2 truncate">{matter.name}</p>}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-xs text-gray-400">{formatDate(task.dueDate || new Date().toISOString())}</span>

                          {/* Task Actions */}
                          <div className="flex gap-1 items-center">
                            {column !== 'To Do' && (
                              <button onClick={() => updateTaskStatus(task.id, COLUMNS[COLUMNS.indexOf(column) - 1])} className="text-gray-400 hover:text-slate-800 text-xs px-1" title="Move Back">←</button>
                            )}
                            {column !== 'Done' && (
                              <button onClick={() => updateTaskStatus(task.id, COLUMNS[COLUMNS.indexOf(column) + 1])} className="text-gray-400 hover:text-slate-800 text-xs px-1" title="Move Forward">→</button>
                            )}
                            {column === 'Done' && (
                              <>
                                <select
                                  value={task.outcome || ''}
                                  onChange={(e) => updateTask(task.id, { outcome: e.target.value as TaskOutcome })}
                                  className={`text-[10px] px-1 py-0.5 rounded border ${task.outcome === 'success' ? 'bg-green-100 text-green-700 border-green-200' :
                                    task.outcome === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                                      task.outcome === 'cancelled' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                        'bg-blue-50 text-blue-600 border-blue-200'
                                    }`}
                                  title={t('mark_outcome')}
                                >
                                  <option value="">{t('mark_outcome')}</option>
                                  <option value="success">{t('outcome_success')}</option>
                                  <option value="failed">{t('outcome_failed')}</option>
                                  <option value="cancelled">{t('outcome_cancelled')}</option>
                                </select>
                                <button
                                  onClick={() => archiveTask(task.id)}
                                  className="text-gray-400 hover:text-green-600 text-xs p-1 rounded hover:bg-green-50"
                                  title="Archive"
                                >
                                  <Archive className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t('delete_task'),
                                  message: t('confirm_delete'),
                                  confirmText: t('delete_task'),
                                  cancelText: t('cancel'),
                                  variant: 'danger'
                                });
                                if (ok) {
                                  deleteTask(task.id);
                                  toast.success(t('task_deleted'));
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 text-xs p-1 rounded hover:bg-red-50"
                              title={t('delete_task')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
            <h3 className="font-bold text-lg mb-4 text-slate-800">{t('add_task')}</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('title')}</label>
                <input required className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none" placeholder="Draft Motion..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  placeholder="Optional details..."
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('nav_matters')}</label>
                <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none" value={newTaskMatterId} onChange={e => setNewTaskMatterId(e.target.value)}>
                  <option value="">-- No Matter --</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                  <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                  <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
                <button type="submit" className="px-3 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Şablondan Görev Oluştur</h3>
                <p className="text-sm text-gray-500 mt-1">Bir şablon seçin, Matter’a bağlayın ve tek seferde checklist oluşturun.</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFromTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Şablon</label>
                <select
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  required
                >
                  <option value="">-- Şablon seçin --</option>
                  {taskTemplates.map(tp => (
                    <option key={tp.id} value={tp.id}>
                      {tp.category ? `[${tp.category}] ` : ''}{tp.name}
                    </option>
                  ))}
                </select>
                {templateId && (
                  <div className="mt-2 text-xs text-gray-500">
                    {taskTemplates.find(t => t.id === templateId)?.description}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('nav_matters')}</label>
                <select
                  value={templateMatterId}
                  onChange={e => setTemplateMatterId(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                >
                  <option value="">-- No Matter --</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={templateBaseDate}
                    onChange={e => setTemplateBaseDate(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Atanan (Initials)</label>
                  <input
                    value={templateAssignedTo}
                    onChange={e => setTemplateAssignedTo(e.target.value)}
                    placeholder="MR / JP / ..."
                    className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">
                  {t('cancel')}
                </button>
                <button type="submit" className="px-3 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm">
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
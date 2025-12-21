import React, { useState, useMemo } from 'react';
import { CalendarEvent } from '../types';
import { Clock, Plus, X, ChevronRight, Trash } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { translations } from '../translations';
import { useData } from '../contexts/DataContext';
import { useConfirm } from './ConfirmDialog';

const CalendarView: React.FC = () => {
  const { t, language } = useTranslation();
  const { events, addEvent, deleteEvent, tasks } = useData();
  const { confirm } = useConfirm();
  const daysShort = (translations[language] as any)?.days_short || translations['en'].days_short;

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Meeting');
  const [newTime, setNewTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState(60); // dakika
  const [newReminderMinutes, setNewReminderMinutes] = useState(30); // 30 dk önce default

  // --- CALENDAR LOGIC ---
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay = getFirstDayOfMonth(currentYear, currentMonth); // 0 (Sun) to 6 (Sat)

  // Generate calendar grid array
  // Padding for empty cells before the 1st of the month
  const emptySlots = Array.from({ length: startDay });
  const daySlots = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedDate) return;

    const [hour, minute] = newTime.split(':').map(Number);
    const eventDate = new Date(currentYear, currentMonth, selectedDate.getDate(), hour || 9, minute || 0, 0);

    addEvent({
      id: `ev${Date.now()}`,
      title: newTitle,
      date: eventDate.toISOString(),
      type: newType as any,
      duration: newDuration,
      reminderMinutes: newReminderMinutes,
      reminderSent: false
    });
    setShowModal(false);
    setNewTitle('');
    setNewDuration(60);
    setNewReminderMinutes(30);
  };

  const openAddModal = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setShowModal(true);
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50/50 relative overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-sans text-slate-900">{t('cal_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(currentYear, currentMonth).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
            else { setCurrentMonth(m => m - 1); }
          }} className="p-2 hover:bg-gray-200 rounded text-slate-600">
            &larr;
          </button>
          <button onClick={() => {
            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
            else { setCurrentMonth(m => m + 1); }
          }} className="p-2 hover:bg-gray-200 rounded text-slate-600">
            &rarr;
          </button>
        </div>
      </div>

      <div className="flex h-full gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-card border border-gray-200 flex flex-col overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {daysShort.map((d: string) => (
              <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-gray-100">
            {emptySlots.map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/30"></div>)}

            {daySlots.map((day) => {
              const isToday =
                day === currentDate.getDate() &&
                currentMonth === currentDate.getMonth() &&
                currentYear === currentDate.getFullYear();

              const dayEvents = events.filter(e => {
                const d = new Date(e.date);
                return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              });

              // Get tasks with deadlines on this day
              const dayTasks = tasks.filter(t => {
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate);
                return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              });

              return (
                <div
                  key={day}
                  onClick={() => openAddModal(day)}
                  className={`min-h-[100px] p-2 relative hover:bg-blue-50 cursor-pointer transition-colors group flex flex-col gap-1 ${isToday ? 'bg-blue-50/50' : ''}`}
                >
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}>
                    {day}
                  </span>

                  {/* Event Indicators */}
                  <div className="flex flex-col gap-1 mt-1">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium group/item relative ${
                          // Şu an gerçekleşiyor mu kontrol et
                          (() => {
                            const now = Date.now();
                            const start = new Date(ev.date).getTime();
                            const end = start + (ev.duration || 60) * 60 * 1000;
                            const isHappening = now >= start && now <= end;
                            const isPast = end < now;

                            if (isHappening) return 'bg-green-500 text-white animate-pulse ring-2 ring-green-300 z-10';
                            if (isPast) return 'bg-gray-100 text-gray-400 opacity-60 line-through decoration-gray-400';

                            return ev.type === 'Court' ? 'bg-red-100 text-red-700' :
                              ev.type === 'Deadline' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700';
                          })()
                          }`}
                        title={ev.title}
                      >
                        <span className="truncate block">{ev.title}</span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              title: 'Etkinliği sil',
                              message: `"${ev.title}" etkinliğini silmek istiyor musunuz?`,
                              confirmText: 'Sil',
                              cancelText: 'İptal',
                              variant: 'danger'
                            });
                            if (!ok) return;
                            deleteEvent(ev.id);
                          }}
                          className="absolute right-1 top-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity text-red-600 hover:text-red-800"
                          title="Delete event"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {/* Task Indicators */}
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${task.priority === 'High' ? 'bg-purple-100 text-purple-700' :
                          task.priority === 'Medium' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        title={`Task: ${task.title}`}
                      >
                        <span className="truncate block">📋 {task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar Schedule */}
        <div className="w-80 bg-white rounded-xl shadow-card border border-gray-200 p-6 flex flex-col">
          <h3 className="font-bold text-lg text-slate-900 mb-4">{t('upcoming_schedule')}</h3>
          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm italic">
              No upcoming events.
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto pr-2">
              {events
                .filter(e => {
                  const end = new Date(e.date).getTime() + (e.duration || 60) * 60 * 1000;
                  return end >= Date.now();
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(event => (
                  <div key={event.id} className="flex gap-3 relative group">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-slate-400 mt-2 group-hover:bg-primary-500 transition-colors"></div>
                      <div className="w-px h-full bg-gray-200 my-1"></div>
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString() + " " + new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide
                         ${(() => {
                              const now = Date.now();
                              const start = new Date(event.date).getTime();
                              const end = start + (event.duration || 60) * 60 * 1000;
                              const isHappening = now >= start && now <= end;
                              if (isHappening) return 'bg-green-500 text-white animate-pulse';
                              return event.type === 'Court' ? 'bg-red-50 text-red-700' :
                                event.type === 'Deadline' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
                            })()}`}>
                            {(() => {
                              const now = Date.now();
                              const start = new Date(event.date).getTime();
                              const end = start + (event.duration || 60) * 60 * 1000;
                              const isHappening = now >= start && now <= end;
                              return isHappening ? '🔴 ŞU AN' : event.type;
                            })()}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Etkinliği sil',
                              message: `"${event.title}" etkinliğini silmek istiyor musunuz?`,
                              confirmText: 'Sil',
                              cancelText: 'İptal',
                              variant: 'danger'
                            });
                            if (!ok) return;
                            deleteEvent(event.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                          title="Delete event"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <button onClick={() => openAddModal(currentDate.getDate())} className="mt-4 w-full py-2 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700">
            + Quick Add Today
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
              <h3 className="font-bold text-lg text-slate-900">Add Event</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="mb-4 bg-blue-50 px-3 py-2 rounded text-blue-800 text-sm font-medium">
              Date: {selectedDate?.toLocaleDateString()}
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
                <input required className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none" placeholder="e.g. Client Meeting" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                  <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none" value={newType} onChange={e => setNewType(e.target.value)}>
                    <option>Meeting</option>
                    <option>Court</option>
                    <option>Deadline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                  <input type="time" className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none" value={newTime} onChange={e => setNewTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label>
                  <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))}>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>All day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reminder</label>
                  <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none" value={newReminderMinutes} onChange={e => setNewReminderMinutes(Number(e.target.value))}>
                    <option value={0}>No reminder</option>
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
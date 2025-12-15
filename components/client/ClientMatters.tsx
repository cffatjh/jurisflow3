import React, { useState, useEffect } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { Matter } from '../../types';
import { Clock, FileText, DollarSign } from '../Icons';

const ClientMatters: React.FC = () => {
  const { client } = useClientAuth();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatters = async () => {
      try {
        const token = localStorage.getItem('client_token');
        const res = await fetch('/api/client/matters', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setMatters(data);
      } catch (error) {
        console.error('Error loading matters:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatters();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (selectedMatter) {
    const allTimeEntries = selectedMatter.timeEntries || [];
    const allExpenses = selectedMatter.expenses || [];
    const unbilledTime = allTimeEntries.filter(te => !te.billed);
    const unbilledExpenses = allExpenses.filter(e => !e.billed);
    const billedTime = allTimeEntries.filter(te => te.billed);
    const billedExpenses = allExpenses.filter(e => e.billed);
    const totalUnbilled = unbilledTime.reduce((sum, te) => sum + (te.duration * te.rate / 60), 0) +
                          unbilledExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBilled = billedTime.reduce((sum, te) => sum + (te.duration * te.rate / 60), 0) +
                        billedExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="p-8 h-full overflow-y-auto">
        <button 
          onClick={() => setSelectedMatter(null)}
          className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Cases
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedMatter.name}</h2>
              <p className="text-gray-600 mt-1">Case #: {selectedMatter.caseNumber}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              selectedMatter.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedMatter.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <div className="text-sm text-gray-600">Practice Area</div>
              <div className="font-semibold text-slate-900">{selectedMatter.practiceArea}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Fee Structure</div>
              <div className="font-semibold text-slate-900">{selectedMatter.feeStructure}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Open Date</div>
              <div className="font-semibold text-slate-900">{new Date(selectedMatter.openDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Attorney</div>
              <div className="font-semibold text-slate-900">{selectedMatter.responsibleAttorney}</div>
            </div>
          </div>
        </div>

        {/* Time Entries & Expenses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Time Entries
            </h3>
            
            {/* Unbilled Time Entries */}
            {unbilledTime.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-amber-600 uppercase mb-2">Unbilled</div>
                <div className="space-y-2">
                  {unbilledTime.slice(0, 5).map(te => (
                    <div key={te.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-sm font-medium text-slate-900">{te.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(te.date).toLocaleDateString()} • {Math.floor(te.duration / 60)}h {te.duration % 60}m @ ${te.rate}/hr
                      </div>
                      <div className="text-xs font-semibold text-amber-700 mt-1">
                        ${((te.duration * te.rate) / 60).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Billed Time Entries */}
            {billedTime.length > 0 && (
              <div>
                <div className="text-xs font-bold text-green-600 uppercase mb-2">Billed</div>
                <div className="space-y-2">
                  {billedTime.slice(0, 5).map(te => (
                    <div key={te.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-slate-900">{te.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(te.date).toLocaleDateString()} • {Math.floor(te.duration / 60)}h {te.duration % 60}m @ ${te.rate}/hr
                      </div>
                      <div className="text-xs font-semibold text-green-700 mt-1">
                        ${((te.duration * te.rate) / 60).toFixed(2)} (Billed)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {allTimeEntries.length === 0 && (
              <p className="text-gray-400 text-sm">No time entries</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Expenses
            </h3>
            
            {/* Unbilled Expenses */}
            {unbilledExpenses.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-amber-600 uppercase mb-2">Unbilled</div>
                <div className="space-y-2">
                  {unbilledExpenses.slice(0, 5).map(exp => (
                    <div key={exp.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-sm font-medium text-slate-900">{exp.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(exp.date).toLocaleDateString()} • {exp.category}
                      </div>
                      <div className="text-xs font-semibold text-amber-700 mt-1">
                        ${exp.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Billed Expenses */}
            {billedExpenses.length > 0 && (
              <div>
                <div className="text-xs font-bold text-green-600 uppercase mb-2">Billed</div>
                <div className="space-y-2">
                  {billedExpenses.slice(0, 5).map(exp => (
                    <div key={exp.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-slate-900">{exp.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(exp.date).toLocaleDateString()} • {exp.category}
                      </div>
                      <div className="text-xs font-semibold text-green-700 mt-1">
                        ${exp.amount.toFixed(2)} (Billed)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {allExpenses.length === 0 && (
              <p className="text-gray-400 text-sm">No expenses</p>
            )}
          </div>
        </div>
        
        {/* Calendar Events for this Matter */}
        {selectedMatter.events && selectedMatter.events.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Upcoming Events</h3>
            <div className="space-y-2">
              {selectedMatter.events
                .filter((e: any) => new Date(e.date) >= new Date())
                .slice(0, 5)
                .map((event: any) => (
                  <div key={event.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{event.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold
                        ${event.type === 'Court' ? 'bg-red-100 text-red-700' : 
                          event.type === 'Deadline' ? 'bg-amber-100 text-amber-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-amber-600 font-medium">Unbilled Work in Progress</div>
                <div className="text-2xl font-bold text-amber-900 mt-1">${totalUnbilled.toFixed(2)}</div>
              </div>
              <div className="text-sm text-amber-600">
                This amount will appear on your next invoice
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-green-600 font-medium">Total Billed</div>
                <div className="text-2xl font-bold text-green-900 mt-1">${totalBilled.toFixed(2)}</div>
              </div>
              <div className="text-sm text-green-600">
                Already invoiced
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Cases</h2>
        <p className="text-gray-600 mt-1">View details of your legal matters</p>
      </div>

      {matters.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No cases found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matters.map(matter => (
            <div 
              key={matter.id} 
              onClick={() => setSelectedMatter(matter)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{matter.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Case #: {matter.caseNumber}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    <span>{matter.practiceArea}</span>
                    <span>•</span>
                    <span>Opened: {new Date(matter.openDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    matter.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {matter.status}
                  </span>
                  <span className="text-xs text-gray-500">Click to view details</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientMatters;


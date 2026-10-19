import React, { useState } from 'react';
import { X, Plus, Pencil, Check, AlertCircle, CheckCircle2, Tag, Loader2, Sparkles } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface ManagePrimaryComplaintsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagePrimaryComplaintsModal: React.FC<ManagePrimaryComplaintsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { conditions, addCondition, updateCondition } = useHospital();

  const [newConditionName, setNewConditionName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const showFeedback = (success: string, error: string = '') => {
    setSuccessMessage(success);
    setErrorMessage(error);
    if (success) {
      setTimeout(() => {
        setSuccessMessage(prev => prev === success ? '' : prev);
      }, 3500);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    const trimmed = newConditionName.trim();
    if (!trimmed) {
      setErrorMessage('Condition name cannot be empty.');
      return;
    }

    if (conditions.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Condition "${trimmed}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addCondition(trimmed);
      if (result.success) {
        setNewConditionName('');
        showFeedback(result.message || `Condition "${trimmed}" added successfully!`);
      } else {
        setErrorMessage(result.message || 'Failed to add condition.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving condition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleUpdate = async (oldName: string) => {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedNew = editingValue.trim();
    if (!trimmedNew) {
      setErrorMessage('Condition name cannot be empty.');
      return;
    }

    if (oldName.toLowerCase() !== trimmedNew.toLowerCase()) {
      if (conditions.some(c => c.toLowerCase() === trimmedNew.toLowerCase())) {
        setErrorMessage(`Condition "${trimmedNew}" already exists.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await updateCondition(oldName, trimmedNew);
      if (result.success) {
        setEditingIndex(null);
        setEditingValue('');
        showFeedback(result.message || `Condition updated to "${trimmedNew}" successfully!`);
      } else {
        setErrorMessage(result.message || 'Failed to update condition.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating condition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92dvh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Primary Complaint Management
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Add new conditions or update existing options in the Primary Complaint dropdown
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          
          {/* 1. Add New Condition Form */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5 tracking-wider">
              Add New Primary Complaint / Condition
            </label>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newConditionName}
                onChange={e => {
                  setNewConditionName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter condition name (e.g. Kidney Stones)"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newConditionName.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Condition
              </button>
            </form>
          </div>

          {/* 2. Existing Conditions List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Current Condition Options ({conditions.length})
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Appears in all Select Condition dropdowns
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs max-h-[300px] overflow-y-auto">
              {conditions.map((item, index) => {
                const isEditing = editingIndex === index;

                return (
                  <div
                    key={`${item}_${index}`}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdate(item);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(item)}
                          disabled={isSubmitting || !editingValue.trim()}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {item}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(index, item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Update Condition Name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Update</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            Saved to system database. Updates reflect instantly.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

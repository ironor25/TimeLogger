import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';

interface WorkNotesModalProps {
  isOpen: boolean;
  initialNotes: string;
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
}

export const WorkNotesModal: React.FC<WorkNotesModalProps> = ({
  isOpen,
  initialNotes,
  onClose,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState(initialNotes);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNotes(notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Work Memo / Notes</h3>
              <p className="text-[10px] text-slate-400">Describe what you are currently working on</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <textarea
            rows={4}
            placeholder="e.g. Implementing responsive navigation bar, fixing layout bugs in CSS..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Memo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

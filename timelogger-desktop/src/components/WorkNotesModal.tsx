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
    <div className="fixed inset-0 z-50 bg-[#161616]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none w-full max-w-sm p-5 space-y-4 font-sans tracking-carbon shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe]/10 text-[#0f62fe] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#161616]">Work Memo / Notes</h3>
              <p className="text-[10px] text-[#525252]">Describe what you are currently working on</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#525252] hover:text-[#161616] p-1 rounded-none hover:bg-[#f4f4f4] transition-colors cursor-pointer"
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
            className="w-full bg-[#f4f4f4] border border-[#e0e0e0] rounded-none p-3 text-xs text-[#161616] placeholder:text-[#8c8c8c] focus:outline-none focus:border-[#0f62fe] transition-colors resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] text-[#161616] text-xs font-normal border border-[#e0e0e0] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-none bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

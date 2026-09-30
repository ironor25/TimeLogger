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
    <div className="fixed inset-0 z-50 bg-[#161616]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#262626] border border-[#393939] rounded-none w-full max-w-sm p-5 space-y-4 font-sans tracking-carbon">
        <div className="flex items-center justify-between border-b border-[#393939] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe]/20 text-[#0f62fe] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#ffffff]">Work Memo / Notes</h3>
              <p className="text-[10px] text-[#8c8c8c]">Describe what you are currently working on</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c8c] hover:text-white p-1 rounded-none hover:bg-[#393939] transition-colors cursor-pointer"
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
            className="w-full bg-[#161616] border border-[#393939] rounded-none p-3 text-xs text-[#ffffff] placeholder:text-[#8c8c8c] focus:outline-none focus:border-[#0f62fe] transition-colors resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-none bg-[#161616] hover:bg-[#393939] text-[#c6c6c6] text-xs font-normal border border-[#393939] transition-colors cursor-pointer"
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

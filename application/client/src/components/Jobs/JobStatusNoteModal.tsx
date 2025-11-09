import React, { useState } from "react";

interface JobStatusNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  existingNote?: string;
}

const JobStatusNoteModal: React.FC<JobStatusNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingNote = "",
}) => {
  const [note, setNote] = useState(existingNote);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Add/Edit Note</h2>
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for this status..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => onSave(note)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobStatusNoteModal;

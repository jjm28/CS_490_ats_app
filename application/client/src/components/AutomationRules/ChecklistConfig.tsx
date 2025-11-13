import { useState } from "react";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface Props {
  config: any;
  onChange: (updated: any) => void;
}

export default function ChecklistConfig({ config, onChange }: Props) {
  const initial = Array.isArray(config.items) ? config.items : [];
  const [items, setItems] = useState<ChecklistItem[]>(initial);

  const updateItems = (newItems: ChecklistItem[]) => {
    setItems(newItems);
    onChange({ ...config, items: newItems });
  };

  const addItem = () => {
    const newItems = [...items, { label: "", done: false }];
    updateItems(newItems);
  };

  const updateItemLabel = (index: number, label: string) => {
    const newItems = [...items];
    newItems[index].label = label;
    updateItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  return (
    <div className="space-y-4">

      <p className="text-gray-600">
        Create a checklist that will automatically attach to each new application.
      </p>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex gap-2 items-center border p-2 rounded bg-gray-50"
          >
            <input
              type="text"
              value={item.label}
              placeholder="Checklist item..."
              className="flex-1 border rounded px-3 py-1"
              onChange={(e) => updateItemLabel(idx, e.target.value)}
            />

            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-red-600 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          + Add Checklist Item
        </button>
      </div>

    </div>
  );
}
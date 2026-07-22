import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";

interface EditableProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Editable({ 
  value, 
  onCommit, 
  placeholder = "Editar...",
  disabled = false
}: EditableProps) {
  
  const service = useMachine(editable.machine, {
    id: useId(),
    value, 
    disabled,
    submitMode: "both",
    activationMode: "click", // 🚀 UX: Un solo clic para editar
    autoResize: true,
    onValueCommit: (details) => {
      onCommit(details.value);
    },
  });

  const api = editable.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} class="group flex flex-col gap-2 w-full">
      <div {...api.getAreaProps()} class="relative w-full">
        
        <input 
          {...api.getInputProps()} 
          class="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-2 py-1 text-gray-900 shadow-sm transition-all"
        />
        
        {/* 🚀 CORRECCIÓN FATAL: El span ya no se auto-cierra. Le pasamos api.value o el placeholder como hijo (children) */}
        <span 
          {...api.getPreviewProps()} 
          class="block cursor-text px-2 py-1 rounded transition-colors text-gray-800 
                 hover:bg-gray-100 
                 group-zag-disabled:opacity-50 
                 group-zag-disabled:cursor-not-allowed
                 truncate"
        >
          {api.value || placeholder}
        </span>

      </div>
    </div>
  );
}
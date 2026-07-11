import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";

interface EditableProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
}

export function Editable({ value, onCommit, placeholder = "Editar..." }: EditableProps) {
  // 1. API Moderna: Primero la máquina estática, luego el objeto de configuración.
  // Devuelve un 'service' unificado en lugar del arreglo [state, send].
  const service = useMachine(editable.machine, {
    id: useId(),
    value,
    submitMode: "both",
    activationMode: "dblclick",
    autoResize: true,
    onValueCommit: (details) => onCommit(details.value),
  });

  // 2. Conexión limpia: Solo pasamos el servicio y el normalizador.
  const api = editable.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} class="flex flex-col gap-2">
      <div {...api.getAreaProps()} class="relative">
        <input 
          {...api.getInputProps()} 
          class="w-full bg-transparent outline-none ring-2 ring-blue-500 rounded px-1"
        />
        <span 
          {...api.getPreviewProps()} 
          class="cursor-text px-1 hover:bg-gray-100/10 rounded transition-colors empty:before:content-[attr(data-placeholder)]"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
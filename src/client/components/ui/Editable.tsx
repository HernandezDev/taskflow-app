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
    submitMode: "both", // Guarda al presionar Enter o al hacer clic fuera (blur)
    activationMode: "dblclick", 
    autoResize: true,
    
    // Dispara la mutación pesada hacia tu orquestador asíncrono
    onValueCommit: (details) => {
      onCommit(details.value);
    },
  });

  // 2. Traductor a Preact
  const api = editable.connect(service, normalizeProps);

  return (
    // 3. Patrón de estilos grupales (Tailwind)
    <div {...api.getRootProps()} class="group flex flex-col gap-2 w-full">
      <div {...api.getAreaProps()} class="relative w-full">
        <input 
          {...api.getInputProps()} 
          class="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-2 py-1 text-gray-900 shadow-sm transition-all"
        />
        <span 
          {...api.getPreviewProps()} 
          class="cursor-text px-2 py-1 rounded transition-colors text-gray-800 
               hover:bg-gray-100 
                group-zag-disabled:opacity-50 
                group-zag-disabled:cursor-not-allowed
                zag-empty:before:content-[attr(data-placeholder)] 
              zag-empty:before:text-gray-400"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
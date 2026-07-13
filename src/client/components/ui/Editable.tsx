import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";

interface EditableProps {
  value: string;
  // Sincronización en tiempo real para el Signal
  onValueChange?: (value: string) => void;
  // Acción de negocio (ej: Guardar en Cloudflare D1)
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Editable({ 
  value, 
  onValueChange, 
  onCommit, 
  placeholder = "Editar...",
  disabled = false
}: EditableProps) {
  
  // 1. La Máquina (Totalmente Controlada por Props/Signals)
  const service = useMachine(editable.machine, {
    id: useId(),
    value, 
    disabled,
    submitMode: "both", // Guarda al presionar Enter o al hacer clic fuera (blur)
    activationMode: "dblclick", 
    autoResize: true,
    
    // Mantiene tu Signal sincronizado en cada pulsación de tecla
    onValueChange: (details) => {
      if (onValueChange) onValueChange(details.value);
    },
    
    // Dispara la mutación pesada hacia tu base de datos
    onValueCommit: (details) => {
      onCommit(details.value);
    },
  });

  // 2. Traductor a Preact
  const api = editable.connect(service, normalizeProps);

  return (
    // 3. Agregamos 'group' para aplicar el patrón de estilos basados en el padre
    <div {...api.getRootProps()} class="group flex flex-col gap-2 w-full">
      <div {...api.getAreaProps()} class="relative w-full">
        <input 
          {...api.getInputProps()} 
          class="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-2 py-1 text-gray-900 shadow-sm transition-all"
        />
        <span 
          {...api.getPreviewProps()} 
          // 4. Estilos reactivos al estado sin usar JavaScript condicional
          class="cursor-text px-2 py-1 rounded transition-colors text-gray-800 
                 hover:bg-gray-100 group-data-disabled:opacity-50 
                 group-data-disabled:cursor-not-allowed
                 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";
import { useOptimisticMutation } from "../../hooks/useOptimisticMutation";

interface EditableProps {
  value: string;
  // Alteración de Contrato: Obligamos al padre (TaskItem) a retornar el éxito de la operación
  onCommit: (value: string) => Promise<boolean>;
  placeholder?: string;
  disabled?: boolean;
}

export function Editable({ 
  value, 
  onCommit, 
  placeholder = "Editar...",
  disabled = false
}: EditableProps) {
  
  // Consumimos la abstracción
  const { localValue, updateLocalOnly, isSaving, errorMsg, commitChange } = useOptimisticMutation<string>(
      value,
      onCommit
  );
  
  const service = useMachine(editable.machine, {
    id: useId(),
    value: localValue.value, 
    disabled: disabled || isSaving.value, // Bloqueo de red + Bloqueo externo
    submitMode: "both",
    activationMode: "click",
    autoResize: true,
    
    // Tipeo -> Solo memoria RAM
    onValueChange: (details) => updateLocalOnly(details.value),
    
    // Enter -> Disparo de Red (Orquestador D1)
    onValueCommit: (details) => commitChange(details.value),
  });

  const api = editable.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} class="group flex flex-col gap-1 w-full">
      <div {...api.getAreaProps()} class="relative w-full">
        <input 
          {...api.getInputProps()} 
          class="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-2 py-1 text-gray-900 shadow-sm transition-all"
        />
        
        <span 
          {...api.getPreviewProps()} 
          class="block cursor-text px-2 py-1 rounded transition-colors text-gray-800 hover:bg-gray-100 group-zag-disabled:opacity-50 group-zag-disabled:cursor-not-allowed truncate"
        >
          {api.value || placeholder}
        </span>
      </div>
      {errorMsg.value && <span class="text-xs text-red-500 font-medium pl-1">{errorMsg.value}</span>}
    </div>
  );
}
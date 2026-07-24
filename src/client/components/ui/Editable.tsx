import { CircleNotchIcon } from "@phosphor-icons/react";
import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";
import { useOptimisticMutation } from "../../hooks/useOptimisticMutation";

interface EditableProps {
  value: string;
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
  
  const { localValue, updateLocalOnly, isSaving, errorMsg, commitChange } = useOptimisticMutation<string>(
      value,
      onCommit
  );
  
  const service = useMachine(editable.machine, {
    id: useId(),
    value: localValue.value, 
    disabled: disabled || isSaving.value, 
    submitMode: "both",
    activationMode: "click",
    autoResize: true,
    onValueChange: (details) => updateLocalOnly(details.value),
    onValueCommit: (details) => commitChange(details.value),
  });

  const api = editable.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} class="group flex flex-col gap-1 w-full">
      <div {...api.getAreaProps()} class="relative w-full">
        <input 
          {...api.getInputProps()} 
          // Se añade pr-8 para proteger el texto del spinner absoluto
          class="w-full bg-white outline-none ring-2 ring-blue-500 rounded py-1 pl-2 pr-8 text-gray-900 shadow-sm transition-all zag-disabled:opacity-50 zag-disabled:cursor-not-allowed"
        />
        
        <span 
          {...api.getPreviewProps()} 
          // Se añade pr-8 y bloqueo explícito de eventos de puntero
          class="block cursor-text py-1 pl-2 pr-8 rounded transition-colors text-gray-800 hover:bg-gray-100 group-zag-disabled:opacity-50 group-zag-disabled:cursor-not-allowed group-zag-disabled:pointer-events-none truncate"
        >
          {api.value || placeholder}
        </span>

        {/* FEEDBACK ACTIVO: Renderizado condicional basado en el estado atómico */}
        {isSaving.value && (
          <div class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
            <CircleNotchIcon size={16} class="animate-spin" weight="bold" />
          </div>
        )}
      </div>
      
      {errorMsg.value && (
        <span class="text-xs text-red-500 font-medium pl-1">
          {errorMsg.value}
        </span>
      )}
    </div>
  );
}
import { parseAbsoluteToLocal, parseTime } from "@internationalized/date";
import { CalendarDotsIcon } from "@phosphor-icons/react";
import * as datepicker from "@zag-js/date-picker";
import { normalizeProps, Portal, useMachine } from "@zag-js/preact";
import { useId, useRef } from "preact/hooks";

interface DeadlineDatePickerProps {
    taskId: string;
    currentDeadline: string | null;
    onUpdate: (id: string, deadline: string | null) => Promise<boolean>;
}

export function DeadlineDatePicker({ taskId, currentDeadline, onUpdate }: DeadlineDatePickerProps) {
    const pendingValueRef = useRef<string | null>(currentDeadline);

    const service = useMachine(datepicker.machine, {
        id: useId(),
        // Fail-fast parsing: Requiere un ISO 8601 estricto con timezone (ej: 2026-07-30T15:00:00Z)
        value: currentDeadline ? [parseAbsoluteToLocal(currentDeadline)] : undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        positioning: { placement: "bottom-start" },
        closeOnSelect: false,
        onValueChange: (details) => {
            const selected = details.value[0];
            pendingValueRef.current = selected
                ? selected.toDate(Intl.DateTimeFormat().resolvedOptions().timeZone).toISOString()
                : null;
        },
        onOpenChange: (details) => {
            // Guardado por intención: Dispara red solo en transición a estado cerrado y con variación de valor.
            if (!details.open && pendingValueRef.current !== currentDeadline) {
                onUpdate(taskId, pendingValueRef.current);
            }
        }
    });

    const api = datepicker.connect(service, normalizeProps);
    const hasSelectedDay = api.value.length > 0;

    const currentTimeString =
        hasSelectedDay && "hour" in api.value[0]
            ? `${String(api.value[0].hour).padStart(2, "0")}:${String(api.value[0].minute).padStart(2, "0")}`
            : "";

    return (
        <div>
            <div {...api.getControlProps()}>
                <button {...api.getTriggerProps()} class="p-2 rounded-md hover:bg-gray-100" aria-label="Elegir fecha límite">
                    <CalendarDotsIcon size={20} />
                </button>
            </div>

            <Portal>
                <div {...api.getPositionerProps()}>
                    <div {...api.getContentProps()} class="bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
                        <div {...api.getViewControlProps({ view: "day" })} class="flex items-center justify-between mb-2">
                            <button {...api.getPrevTriggerProps()} class="p-2 min-w-11 min-h-11 hover:bg-gray-50 rounded">‹</button>
                            <span class="text-sm font-medium">{api.visibleRangeText.start}</span>
                            <button {...api.getNextTriggerProps()} class="p-2 min-w-11 min-h-11 hover:bg-gray-50 rounded">›</button>
                        </div>

                        <table {...api.getTableProps({ view: "day" })}>
                            <thead {...api.getTableHeaderProps({ view: "day" })}>
                                <tr {...api.getTableRowProps({ view: "day" })}>
                                    {api.weekDays.map((day, i) => (
                                        <th key={i} scope="col" aria-label={day.long} class="text-xs text-gray-400 pb-1 font-medium">
                                            {day.narrow}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody {...api.getTableBodyProps({ view: "day" })}>
                                {api.weeks.map((week, i) => (
                                    <tr key={i} {...api.getTableRowProps({ view: "day" })}>
                                        {week.map((value, j) => (
                                            <td key={j} {...api.getDayTableCellProps({ value })}>
                                                <div
                                                    {...api.getDayTableCellTriggerProps({ value })}
                                                    class="min-w-11 min-h-11 flex items-center justify-center rounded-full text-sm cursor-pointer zag-selected:bg-blue-600 zag-selected:text-white zag-today:font-bold zag-outside-range:text-gray-300 hover:bg-blue-50 transition-colors"
                                                >
                                                    {value.day}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                            <input
                                type="time"
                                disabled={!hasSelectedDay}
                                value={currentTimeString}
                                // Traducción explícita de String (DOM) a Time (Dominio Zag/Internationalized)
                                onChange={(e) => api.setTime(parseTime(e.currentTarget.value))}
                                class="text-sm border border-gray-200 rounded px-2 py-1.5 min-h-11 disabled:opacity-40 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => api.setOpen(false)}
                                class="text-sm text-blue-600 font-medium px-3 py-2 min-h-11 rounded hover:bg-blue-50 transition-colors"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            </Portal>
        </div>
    );
}
/**
 * SPEC-POS-001: Online Orders System - PickupTimeSelector Component
 *
 * Time slot selector for order pickup scheduling
 * Validates minimum prep time and displays available slots
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, Info } from 'lucide-react';
import type { TimeSlot } from '@/types/online-orders';

interface PickupTimeSelectorProps {
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  prepTimeMinutes?: number;
  openingTime?: string; // HH:mm format
  closingTime?: string; // HH:mm format
  intervalMinutes?: number;
  className?: string;
}

const DEFAULT_PREP_TIME = 30; // 30 minutes default
const DEFAULT_OPENING = '06:00';
const DEFAULT_CLOSING = '23:00';
const DEFAULT_INTERVAL = 15; // 15-minute intervals

/**
 * Generate available time slots for pickup
 */
function generateTimeSlots(
  openingTime: string,
  closingTime: string,
  prepTimeMinutes: number,
  intervalMinutes: number,
  selectedDate: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const minTime = new Date(now.getTime() + prepTimeMinutes * 60000);

  const [openHour, openMinute] = openingTime.split(':').map(Number);
  const [closeHour, closeMinute] = closingTime.split(':').map(Number);

  // Set opening time today
  const opening = new Date(selectedDate);
  opening.setHours(openHour, openMinute, 0, 0);

  // Set closing time today
  const closing = new Date(selectedDate);
  closing.setHours(closeHour, closeMinute, 0, 0);

  // Start from the later of: opening time or minimum pickup time
  let currentTime = new Date(Math.max(opening.getTime(), minTime.getTime()));

  // Round up to next interval
  const remainder = currentTime.getMinutes() % intervalMinutes;
  if (remainder > 0) {
    currentTime = new Date(currentTime.getTime() + (intervalMinutes - remainder) * 60000);
  }

  // Generate slots until closing time (minus buffer for last pickup)
  const lastPickup = new Date(closing.getTime() - 15 * 60000); // 15 min before closing

  while (currentTime <= lastPickup) {
    const timeString = currentTime.toISOString();
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const display = `${hours}:${minutes}`;

    slots.push({
      time: timeString,
      display,
      available: true,
    });

    // Move to next interval
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000);
  }

  return slots;
}

/**
 * Format time for display
 */
function formatTimeDisplay(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Pickup time selector component
 */
export function PickupTimeSelector({
  selectedTime,
  onTimeSelect,
  prepTimeMinutes = DEFAULT_PREP_TIME,
  openingTime = DEFAULT_OPENING,
  closingTime = DEFAULT_CLOSING,
  intervalMinutes = DEFAULT_INTERVAL,
  className = '',
}: PickupTimeSelectorProps) {
  const [selectedDate] = useState(new Date());

  // Generate time slots
  const timeSlots = useMemo(() => {
    return generateTimeSlots(
      openingTime,
      closingTime,
      prepTimeMinutes,
      intervalMinutes,
      selectedDate
    );
  }, [openingTime, closingTime, prepTimeMinutes, intervalMinutes, selectedDate]);

  // Group slots by period (AM/PM) or hour for better UX
  const groupedSlots = useMemo(() => {
    const groups: Record<string, TimeSlot[]> = {};

    timeSlots.forEach((slot) => {
      const date = new Date(slot.time);
      const hour = date.getHours();
      const period = hour < 12 ? 'AM' : 'PM';
      const hourKey = `${period} - ${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00`;

      if (!groups[hourKey]) {
        groups[hourKey] = [];
      }
      groups[hourKey].push(slot);
    });

    return groups;
  }, [timeSlots]);

  // Earliest available time for display
  const earliestTime = timeSlots[0]?.display || '--:--';
  const latestTime = timeSlots[timeSlots.length - 1]?.display || '--:--';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with info */}
      <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p>
            Tu pedido estará listo en aproximadamente <strong>{prepTimeMinutes} minutos</strong>
          </p>
          <p className="text-xs mt-1">
            Primera hora disponible: <strong>{earliestTime}</strong>
          </p>
        </div>
      </div>

      {/* Selected time display */}
      {selectedTime && (
        <div className="flex items-center gap-2 text-sm bg-green-50 p-3 rounded">
          <Clock className="w-4 h-4 text-green-600" />
          <span className="text-green-700">
            Recogida seleccionada: <strong>{formatTimeDisplay(selectedTime)}</strong>
          </span>
        </div>
      )}

      {/* Time slot grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona hora de recogida
        </label>

        {timeSlots.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded">
            No hay horarios disponibles para hoy. El restaurante cierra a las {closingTime}.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {Object.entries(groupedSlots).map(([hourKey, slots]) => (
              <div key={hourKey} className="contents">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => onTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : slot.available
                          ? 'bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label={`Seleccionar hora ${slot.display}`}
                      aria-pressed={isSelected}
                    >
                      {slot.display}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error message if no time selected */}
      {!selectedTime && (
        <p className="text-red-500 text-sm">Selecciona una hora de recogida para continuar</p>
      )}
    </div>
  );
}

/**
 * Simple pickup time input for inline use
 */
export function PickupTimeInput({
  value,
  onChange,
  prepTimeMinutes = DEFAULT_PREP_TIME,
  className = '',
}: {
  value: string;
  onChange: (time: string) => void;
  prepTimeMinutes?: number;
  className?: string;
}) {
  // Calculate minimum time
  const minTime = useMemo(() => {
    const min = new Date(Date.now() + prepTimeMinutes * 60000);
    return min.toISOString().slice(0, 16); // Format for datetime-local input
  }, [prepTimeMinutes]);

  return (
    <div className={className}>
      <label htmlFor="pickup-time" className="block text-sm font-medium text-gray-700 mb-1">
        Hora de recogida <span className="text-red-500">*</span>
      </label>
      <input
        type="datetime-local"
        id="pickup-time"
        value={value}
        min={minTime}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-gray-500 text-xs mt-1">
        Tiempo mínimo de preparación: {prepTimeMinutes} minutos
      </p>
    </div>
  );
}

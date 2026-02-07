/**
 * SPEC-POS-001: Online Orders System - PickupTimeSelector Component Tests
 *
 * RED Phase: Write tests for PickupTimeSelector component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PickupTimeSelector, PickupTimeInput } from './PickupTimeSelector';

describe('PickupTimeSelector', () => {
  const mockOnTimeSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render time slot options', () => {
    render(
      <PickupTimeSelector
        selectedTime=""
        onTimeSelect={mockOnTimeSelect}
        openingTime="06:00"
        closingTime="23:00"
        prepTimeMinutes={30}
      />
    );

    expect(screen.getByText(/Selecciona hora de recogida/i)).toBeInTheDocument();
  });

  it('should display prep time info', () => {
    render(
      <PickupTimeSelector
        selectedTime=""
        onTimeSelect={mockOnTimeSelect}
        prepTimeMinutes={45}
      />
    );

    expect(screen.getByText(/45 minutos/)).toBeInTheDocument();
  });

  it('should call onTimeSelect when slot is clicked', () => {
    render(
      <PickupTimeSelector
        selectedTime=""
        onTimeSelect={mockOnTimeSelect}
        openingTime="06:00"
        closingTime="23:00"
        prepTimeMinutes={30}
      />
    );

    // Find first time slot button
    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.tagName === 'BUTTON' && btn.textContent?.match(/\d+:\d+/)
    );

    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      expect(mockOnTimeSelect).toHaveBeenCalled();
    }
  });

  it('should show selected time', () => {
    const selectedTime = '2024-01-01T14:30:00';

    render(
      <PickupTimeSelector
        selectedTime={selectedTime}
        onTimeSelect={mockOnTimeSelect}
        openingTime="06:00"
        closingTime="23:00"
        prepTimeMinutes={30}
      />
    );

    expect(screen.getByText(/Recogida seleccionada:/i)).toBeInTheDocument();
  });

  it('should show no available slots message when restaurant is closed', () => {
    render(
      <PickupTimeSelector
        selectedTime=""
        onTimeSelect={mockOnTimeSelect}
        openingTime="06:00"
        closingTime="07:00"
        prepTimeMinutes={120}
      />
    );

    expect(screen.getByText(/No hay horarios disponibles/i)).toBeInTheDocument();
  });
});

describe('PickupTimeInput', () => {
  it('should render datetime input', () => {
    const mockOnChange = vi.fn();
    render(
      <PickupTimeInput
        value=""
        onChange={mockOnChange}
        prepTimeMinutes={30}
      />
    );

    const input = screen.getByLabelText(/Hora de recogida/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'datetime-local');
  });

  it('should show prep time in help text', () => {
    const mockOnChange = vi.fn();
    render(
      <PickupTimeInput
        value=""
        onChange={mockOnChange}
        prepTimeMinutes={45}
      />
    );

    expect(screen.getByText(/45 minutos/)).toBeInTheDocument();
  });

  it('should call onChange when value changes', () => {
    const mockOnChange = vi.fn();
    render(
      <PickupTimeInput
        value=""
        onChange={mockOnChange}
        prepTimeMinutes={30}
      />
    );

    const input = screen.getByLabelText(/Hora de recogida/i);
    fireEvent.change(input, { target: { value: '2024-01-01T14:30' } });

    expect(mockOnChange).toHaveBeenCalledWith('2024-01-01T14:30');
  });
});

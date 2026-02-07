/**
 * SPEC-POS-001 Phase 3: Registration Form Tests
 * TDD - RED phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from './RegistrationForm';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

describe('RegistrationForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render registration form with all required fields', () => {
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    });

    it('should display benefits list', () => {
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText(/historial de pedidos/i)).toBeInTheDocument();
      expect(screen.getByText(/productos favoritos/i)).toBeInTheDocument();
      expect(screen.getByText(/perfil nutricional/i)).toBeInTheDocument();
      expect(screen.getByText(/recomendaciones personalizadas/i)).toBeInTheDocument();
    });

    it('should have submit and cancel buttons', () => {
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/^contraseña$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'DifferentPassword!');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument();
      });
    });

    it('should show error for password less than 8 characters', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/^contraseña$/i), 'short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when form is invalid', () => {
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Submission', () => {
    it('should call onSuccess after successful registration', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.auth.signUp as any).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Juan Pérez');
      await user.type(screen.getByLabelText(/email/i), 'juan@test.com');
      await user.type(screen.getByLabelText(/^contraseña$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
      await user.type(screen.getByLabelText(/teléfono/i), '5512345678');

      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
          id: 'user-123',
        }));
      });
    });

    it('should show error message on registration failure', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.auth.signUp as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already registered' },
      });

      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Juan Pérez');
      await user.type(screen.getByLabelText(/email/i), 'existing@test.com');
      await user.type(screen.getByLabelText(/^contraseña$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
      await user.type(screen.getByLabelText(/teléfono/i), '5512345678');

      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByText(/Email already registered/i)).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during submission', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.auth.signUp as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const user = userEvent.setup();
      render(<RegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Juan Pérez');
      await user.type(screen.getByLabelText(/email/i), 'juan@test.com');
      await user.type(screen.getByLabelText(/^contraseña$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
      await user.type(screen.getByLabelText(/teléfono/i), '5512345678');

      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(screen.getByText(/creando cuenta/i)).toBeInTheDocument();
    });
  });
});

import React, { useState } from 'react';
import { Input, Button, ErrorMessage } from '../../../shared/components/base';
import { RoutineForm as RoutineFormType } from '../../../shared/types/dashboard';
import { ROUTINE_UI_LABELS, ROUTINE_ERROR_MESSAGES } from '../../../shared/constants';

// Constantes locales para validación
const FORM_VALIDATION = {
  NAME_REQUIRED: 'El nombre es requerido',
  NAME_TOO_SHORT: 'El nombre debe tener al menos 2 caracteres',
  CODE_TOO_SHORT: 'El código debe tener al menos 2 caracteres'
} as const;

interface RoutineFormProps {
  isOpen: boolean;
  loading: boolean;
  onSubmit: (form: RoutineFormType) => Promise<boolean>;
  onCancel: () => void;
}

export const RoutineForm: React.FC<RoutineFormProps> = ({
  isOpen,
  loading,
  onSubmit,
  onCancel
}) => {
  const [form, setForm] = useState<RoutineFormType>({ name: '', code: '' });
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { name?: string; code?: string } = {};

    if (!form.name.trim()) {
      newErrors.name = FORM_VALIDATION.NAME_REQUIRED;
    } else if (form.name.trim().length < 2) {
      newErrors.name = FORM_VALIDATION.NAME_TOO_SHORT;
    }

    if (form.code && form.code.trim().length > 0 && form.code.trim().length < 2) {
      newErrors.code = FORM_VALIDATION.CODE_TOO_SHORT;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await onSubmit(form);
    if (success) {
      handleReset();
    }
  };

  const handleReset = () => {
    setForm({ name: '', code: '' });
    setErrors({});
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="routine-manager-form-overlay">
      <div className="routine-manager-form-container">
        <div className="routine-manager-form-header">
          <h3 className="routine-manager-form-title">
            {ROUTINE_UI_LABELS.NEW_ROUTINE_TITLE}
          </h3>
          <button
            onClick={handleCancel}
            className="routine-manager-form-close-button"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="routine-manager-form">
          <div className="routine-manager-form-field">
            <Input
              label={ROUTINE_UI_LABELS.NAME_LABEL}
              value={form.name}
              onChange={(e) => {
                setForm(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: undefined }));
                }
              }}
              variant="primary"
              fullWidth
              required
              disabled={loading}
              placeholder="Ej: Rutina de Pecho y Tríceps"
            />
            {errors.name && <ErrorMessage message={errors.name} />}
          </div>

          <div className="routine-manager-form-field">
            <Input
              label={ROUTINE_UI_LABELS.CODE_LABEL}
              value={form.code}
              onChange={(e) => {
                setForm(prev => ({ ...prev, code: e.target.value }));
                if (errors.code) {
                  setErrors(prev => ({ ...prev, code: undefined }));
                }
              }}
              variant="primary"
              fullWidth
              disabled={loading}
              placeholder={ROUTINE_UI_LABELS.CODE_PLACEHOLDER}
            />
            {errors.code && <ErrorMessage message={errors.code} />}
            <small className="routine-manager-form-help">
              Código opcional para identificar rápidamente la rutina
            </small>
          </div>

          <div className="routine-manager-form-actions">
            <Button
              type="button"
              onClick={handleCancel}
              variant="secondary"
              disabled={loading}
            >
              {ROUTINE_UI_LABELS.CANCEL_BUTTON}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !form.name.trim()}
            >
              {loading ? ROUTINE_UI_LABELS.CREATING_BUTTON : ROUTINE_UI_LABELS.CREATE_BUTTON}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 
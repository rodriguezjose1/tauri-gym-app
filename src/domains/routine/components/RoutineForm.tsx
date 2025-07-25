import React, { useState, useEffect } from 'react';
import { Input, Button, ErrorMessage, Modal } from '../../../shared/components/base';
import { RoutineForm as RoutineFormType, Routine } from '../../../shared/types/dashboard';
import { ROUTINE_UI_LABELS, ROUTINE_ERROR_MESSAGES } from '../../../shared/constants';
import '../../../styles/RoutineForm.css';

// Constantes locales para validación
const FORM_VALIDATION = {
  NAME_REQUIRED: 'El nombre es requerido',
  NAME_TOO_SHORT: 'El nombre debe tener al menos 2 caracteres',
  CODE_TOO_SHORT: 'El código debe tener al menos 2 caracteres'
} as const;

interface RoutineFormProps {
  isOpen: boolean;
  loading: boolean;
  editingRoutine?: Routine | null;
  onSubmit: (form: RoutineFormType) => Promise<boolean>;
  onCancel: () => void;
}

export const RoutineForm: React.FC<RoutineFormProps> = ({
  isOpen,
  loading,
  editingRoutine,
  onSubmit,
  onCancel
}) => {
  const [form, setForm] = useState<RoutineFormType>({ name: '', code: '' });
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  // Función para generar código automáticamente desde el nombre
  const generateCodeFromName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters, keep only letters, numbers, and spaces
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  // Cargar datos de la rutina cuando se abre el modal de edición
  useEffect(() => {
    if (editingRoutine) {
      setForm({
        name: editingRoutine.name,
        code: editingRoutine.code
      });
    } else {
      setForm({ name: '', code: '' });
    }
    setErrors({});
  }, [editingRoutine, isOpen]);

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

  const isEditMode = !!editingRoutine;
  const title = isEditMode ? 'Editar Rutina' : ROUTINE_UI_LABELS.NEW_ROUTINE_TITLE;
  const submitButtonText = loading 
    ? (isEditMode ? 'Actualizando...' : ROUTINE_UI_LABELS.CREATING_BUTTON)
    : (isEditMode ? 'Actualizar Rutina' : ROUTINE_UI_LABELS.CREATE_BUTTON);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size="md"
    >
      <form onSubmit={handleSubmit} className="routine-form">
        <div className="routine-form-field">
          <Input
            label={ROUTINE_UI_LABELS.NAME_LABEL}
            value={form.name}
            onChange={(e) => {
              const newName = e.target.value;
              setForm(prev => ({ 
                ...prev, 
                name: newName,
                // Auto-generate code from name only when creating new routine
                code: isEditMode ? prev.code : generateCodeFromName(newName)
              }));
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

        <div className="routine-form-field">
          <Input
            label={ROUTINE_UI_LABELS.CODE_LABEL}
            value={form.code}
            onChange={(e) => {
              setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }));
              if (errors.code) {
                setErrors(prev => ({ ...prev, code: undefined }));
              }
            }}
            variant="primary"
            fullWidth
            disabled={loading}
            placeholder={ROUTINE_UI_LABELS.CODE_PLACEHOLDER}
            helperText={isEditMode ? "Puedes editar el código manualmente" : "Se genera automáticamente desde el nombre"}
          />
          {errors.code && <ErrorMessage message={errors.code} />}
          <small className="routine-form-help">
            Código opcional para identificar rápidamente la rutina
          </small>
        </div>

        <div className="routine-form-actions">
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
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}; 
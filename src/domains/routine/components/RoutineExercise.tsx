import React, { useState } from 'react';
import { Button, Select, Card, ErrorMessage, Title } from '../../../shared/components/base';
import { DeleteConfirmationModal } from '../../../shared/components/modals';
import { RoutineExerciseWithDetails } from '../../../shared/types/dashboard';

interface RoutineExerciseProps {
  exercise: RoutineExerciseWithDetails;
  onUpdate: (exerciseId: number, updates: Partial<RoutineExerciseWithDetails>) => Promise<void>;
  onDelete: (exerciseId: number) => Promise<void>;
}

export const RoutineExercise: React.FC<RoutineExerciseProps> = ({
  exercise,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    group_number: exercise.group_number || 1
  });

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      await onUpdate(exercise.id!, { group_number: editForm.group_number });
      setIsEditing(false);
    } catch (saveError) {
      console.error('Error updating routine exercise:', saveError);
      setError('No se pudo actualizar el ejercicio');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      group_number: exercise.group_number || 1
    });
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setError(null);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      setError(null);
      await onDelete(exercise.id!);
      setShowDeleteConfirm(false);
    } catch (deleteError) {
      console.error('Error deleting routine exercise:', deleteError);
      setError('No se pudo eliminar el ejercicio');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleEdit = () => {
    setEditForm({ group_number: exercise.group_number || 1 });
    setError(null);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <Card variant="default" padding="md" className="routine-exercise-edit-card">
        <div className="routine-exercise-edit-form">
          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
          <div className="routine-exercise-group-selection">
            <Select
              label="Grupo"
              value={editForm.group_number.toString()}
              onChange={(value) => setEditForm({ ...editForm, group_number: parseInt(value.toString()) })}
              options={[
                { value: '1', label: 'Grupo 1' },
                { value: '2', label: 'Grupo 2' },
                { value: '3', label: 'Grupo 3' },
                { value: '4', label: 'Grupo 4' },
                { value: '5', label: 'Grupo 5' }
              ]}
              variant="primary"
            />
          </div>
          <div className="routine-exercise-form-actions">
            <Button onClick={handleSave} variant="primary" size="sm" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button onClick={handleCancel} variant="secondary" size="sm" disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        variant="default"
        padding="md"
        className="routine-exercise-card"
      >
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="routine-exercise-info">
          <Title level={4} variant="default" className="routine-exercise-name">
            {exercise.exercise_name}
          </Title>
          <p className="routine-exercise-details">
            Grupo {exercise.group_number || 1}
          </p>
        </div>
        
        <div className="routine-exercise-actions">
          <Button
            onClick={handleEdit}
            variant="secondary"
            size="sm"
          >
            ✏️ Editar
          </Button>
          <Button
            onClick={handleDeleteClick}
            variant="danger"
            size="sm"
          >
            🗑️ Eliminar
          </Button>
        </div>
      </Card>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que deseas eliminar el ejercicio "${exercise.exercise_name}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDeleting={deleting}
      />
    </>
  );
};

import React, { useState } from 'react';
import { Input, Button, Select, Card, Title } from '../../../shared/components/base';
import { RoutineExerciseWithDetails } from '../../../services';

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
  const [editForm, setEditForm] = useState({
    group_number: exercise.group_number || 1
  });

  const handleSave = async () => {
    const updates = {
      group_number: editForm.group_number
    };
    await onUpdate(exercise.id!, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      group_number: exercise.group_number || 1
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este ejercicio?')) {
      await onDelete(exercise.id!);
    }
  };

  if (isEditing) {
    return (
      <Card variant="default" padding="md" className="routine-exercise-edit-card">
        <div className="routine-exercise-edit-form">
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
            <Button onClick={handleSave} variant="primary" size="sm">
              Guardar
            </Button>
            <Button onClick={handleCancel} variant="secondary" size="sm">
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      padding="md"
      className="routine-exercise-card"
    >
      <div className="routine-exercise-avatar">
        {exercise.exercise_name.charAt(0).toUpperCase()}
      </div>
      
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
          onClick={() => setIsEditing(true)}
          variant="secondary"
          size="sm"
        >
          ✏️ Editar
        </Button>
        <Button
          onClick={handleDelete}
          variant="danger"
          size="sm"
        >
          🗑️ Eliminar
        </Button>
      </div>
    </Card>
  );
}; 
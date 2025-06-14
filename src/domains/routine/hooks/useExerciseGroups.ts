import { useState, useMemo, useCallback } from 'react';
import { RoutineExerciseWithDetails } from '../../../shared/types/dashboard';

interface ExerciseGroup {
  groupNumber: number;
  exercises: RoutineExerciseWithDetails[];
}

interface UseExerciseGroupsProps {
  exercises: RoutineExerciseWithDetails[];
}

interface UseExerciseGroupsReturn {
  groupedExercises: ExerciseGroup[];
  emptyGroups: ExerciseGroup[];
  createEmptyGroup: () => void;
  removeEmptyGroup: (groupNumber: number) => void;
}

export const useExerciseGroups = ({ exercises }: UseExerciseGroupsProps): UseExerciseGroupsReturn => {
  const [emptyGroupNumbers, setEmptyGroupNumbers] = useState<number[]>([]);

  // Agrupar ejercicios por group_number
  const groupedExercises = useMemo(() => {
    // Ordenar ejercicios por group_number y order_index
    const sortedExercises = [...exercises].sort((a, b) => {
      const groupA = a.group_number || 1;
      const groupB = b.group_number || 1;
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      return (a.order_index || 0) - (b.order_index || 0);
    });

    // Agrupar ejercicios
    const groups = sortedExercises.reduce((acc, exercise) => {
      const groupNumber = exercise.group_number || 1;
      if (!acc[groupNumber]) {
        acc[groupNumber] = [];
      }
      acc[groupNumber].push(exercise);
      return acc;
    }, {} as Record<number, RoutineExerciseWithDetails[]>);

    // Convertir a array y ordenar por número de grupo
    const result = Object.keys(groups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(groupNumber => ({
        groupNumber: parseInt(groupNumber),
        exercises: groups[parseInt(groupNumber)]
      }));

    return result;
  }, [exercises]);

  // Grupos vacíos como objetos ExerciseGroup
  const emptyGroups = useMemo(() => {
    // Filtrar grupos vacíos que no tienen ejercicios
    const usedGroups = new Set(exercises.map(e => e.group_number || 1));
    const actuallyEmptyGroups = emptyGroupNumbers.filter(groupNum => !usedGroups.has(groupNum));
    
    // Actualizar la lista si hay diferencias
    if (actuallyEmptyGroups.length !== emptyGroupNumbers.length) {
      setEmptyGroupNumbers(actuallyEmptyGroups);
    }

    return actuallyEmptyGroups.map(groupNumber => ({
      groupNumber,
      exercises: []
    }));
  }, [emptyGroupNumbers, exercises]);

  // Crear nuevo grupo vacío
  const createEmptyGroup = useCallback(() => {
    // Encontrar el número de grupo más alto
    const maxGroupNumber = Math.max(
      ...exercises.map(e => e.group_number || 1),
      ...emptyGroupNumbers,
      0
    );
    const newGroupNumber = maxGroupNumber + 1;
    
    setEmptyGroupNumbers(prev => [...prev, newGroupNumber]);
  }, [exercises, emptyGroupNumbers]);

  // Remover grupo vacío
  const removeEmptyGroup = useCallback((groupNumber: number) => {
    setEmptyGroupNumbers(prev => prev.filter(num => num !== groupNumber));
  }, []);

  return {
    groupedExercises,
    emptyGroups,
    createEmptyGroup,
    removeEmptyGroup
  };
}; 
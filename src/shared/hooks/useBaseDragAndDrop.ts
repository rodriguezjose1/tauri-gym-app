import { useState } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useToast } from '../contexts/ToastContext';

export interface BaseItem {
  id: number;
  group_number: number;
  order_index?: number;
}

export interface UseBaseDragAndDropProps<T extends BaseItem> {
  items: T[];
  onUpdateItem: (itemId: number, updates: Partial<T>) => Promise<void>;
  onReorderItems: (itemOrders: Array<[number, number]>) => Promise<void>;
  onGroupEmpty?: (groupNumber: number) => void;
  getGroupId: (item: T) => string;
  getGroupItems: (groupId: string) => T[];
  isValidGroup: (groupId: string) => boolean;
}

export const useBaseDragAndDrop = <T extends BaseItem>({
  items,
  onUpdateItem,
  onReorderItems,
  onGroupEmpty,
  getGroupId,
  getGroupItems,
  isValidGroup
}: UseBaseDragAndDropProps<T>) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [isValidMove, setIsValidMove] = useState(true);
  const { addNotification } = useToast();

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    if (item) {
      setActiveItem(item);
      setIsDragging(true);
      setIsValidMove(true);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItem = items.find(i => i.id === active.id);
    if (!activeItem) return;

    // Si el destino es un grupo
    const overId = String(over.id);
    if (overId.includes('group-')) {
      const targetGroupId = overId.split('-')[1];
      const currentGroupId = getGroupId(activeItem).split('-').pop() || '';
      
      // Si estamos moviendo a un grupo diferente
      if (targetGroupId !== currentGroupId) {
        // Verificar que el grupo de destino existe y es válido
        if (!isValidGroup(targetGroupId)) {
          setIsValidMove(false);
          return;
        }
        
        // Si el grupo de destino es diferente, siempre permitir el movimiento
        setIsValidMove(true);
        return;
      }
    }

    // Para reordenamiento dentro del mismo grupo, verificar que no sea el último
    const currentGroupId = getGroupId(activeItem);
    const itemsInCurrentGroup = getGroupItems(currentGroupId);

    // Si es el último item del grupo, no permitir mover
    if (itemsInCurrentGroup.length === 1) {
      setIsValidMove(false);
      return;
    }

    setIsValidMove(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      
      if (!over || !active.id) {
        setIsDragging(false);
        setActiveItem(null);
        setIsValidMove(true);
        return;
      }

      const activeItem = items.find(i => i.id === active.id);
      if (!activeItem) {
        setIsDragging(false);
        setActiveItem(null);
        setIsValidMove(true);
        return;
      }

      // Si el movimiento no es válido, mostrar notificación y no hacer nada
      if (!isValidMove) {
        addNotification('No puedes mover el último elemento del grupo', 'warning', 3000);
        return;
      }

      const overId = String(over.id);
      
      // Si el destino es un grupo
      if (overId.includes('group-')) {
        const targetGroupId = overId.split('-')[1];
        const targetGroupNumber = parseInt(targetGroupId);

        // Verificar si el grupo de destino es diferente al actual
        if (targetGroupNumber !== activeItem.group_number) {
          // Verificar que el grupo de destino existe y es válido
          if (isValidGroup(targetGroupId)) {
            await onUpdateItem(activeItem.id, {
              ...activeItem,
              group_number: targetGroupNumber
            });
          } else {
            addNotification('No puedes mover el elemento a un grupo que no existe', 'warning', 3000);
          }
        }
      } else {
        // Reordenar items dentro del mismo grupo
        const overItem = items.find(i => i.id === over.id);
        if (!overItem || 
            getGroupId(overItem) !== getGroupId(activeItem)) return;

        // Filtrar items del mismo grupo y ordenarlos por order_index
        const groupItems = getGroupItems(getGroupId(activeItem))
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const oldIndex = groupItems.findIndex(i => i.id === active.id);
        const newIndex = groupItems.findIndex(i => i.id === over.id);

        if (oldIndex !== newIndex) {
          const reorderedItems = arrayMove(groupItems, oldIndex, newIndex);
          const orderUpdates = reorderedItems
            .filter(item => item.id !== undefined)
            .map((item, index) => [item.id!, index]);

          if (orderUpdates.length > 0) {
            await onReorderItems(orderUpdates as Array<[number, number]>);
          }
        }
      }
    } catch (error) {
      console.error('Error in drag and drop:', error);
      addNotification('Error al mover el elemento', 'error', 3000);
    } finally {
      setIsDragging(false);
      setActiveItem(null);
      setIsValidMove(true);
    }
  };

  return {
    isDragging,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}; 
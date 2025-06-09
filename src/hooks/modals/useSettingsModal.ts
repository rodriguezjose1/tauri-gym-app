import { useState } from 'react';

export const useSettingsModal = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  return {
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,
    setShowSettingsModal
  };
}; 
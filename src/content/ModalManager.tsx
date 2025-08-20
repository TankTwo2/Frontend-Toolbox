import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageCollector } from '../features/imageDownloader/imageCollector';
import { StyleExtractor } from '../features/styleInspector/styleExtractor';

// Modal 컴포넌트를 재사용
import Modal from '../components/Modal';
import ImageDownloader from '../features/imageDownloader/ImageDownloader';
import StyleInspector from '../features/styleInspector/StyleInspector';
import VideoRecorder from '../features/videoRecorder/VideoRecorder';

interface ModalState {
  imageDownloader: boolean;
  styleInspector: boolean;
  videoRecorder: boolean;
}

const ModalManager: React.FC = () => {
  const [modals, setModals] = useState<ModalState>({
    imageDownloader: false,
    styleInspector: false,
    videoRecorder: false
  });

  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const message = event.detail;
      switch (message.action) {
        case 'openImageDownloader':
          setModals(prev => ({ ...prev, imageDownloader: true }));
          break;
        case 'openStyleInspector':
          setModals(prev => ({ ...prev, styleInspector: true }));
          break;
        case 'openVideoRecorder':
          setModals(prev => ({ ...prev, videoRecorder: true }));
          break;
      }
    };

    window.addEventListener('frontend-toolbox-message', handleMessage as EventListener);
    return () => window.removeEventListener('frontend-toolbox-message', handleMessage as EventListener);
  }, []);

  const closeModal = (modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  };

  return (
    <>
      {modals.imageDownloader && (
        <ImageDownloader
          isOpen={true}
          onClose={() => closeModal('imageDownloader')}
        />
      )}
      
      {modals.styleInspector && (
        <StyleInspector
          isOpen={true}
          onClose={() => closeModal('styleInspector')}
        />
      )}
      
      {modals.videoRecorder && (
        <VideoRecorder
          isOpen={true}
          onClose={() => closeModal('videoRecorder')}
        />
      )}
    </>
  );
};

export default ModalManager;
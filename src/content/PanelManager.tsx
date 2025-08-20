import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Panel from '../components/Panel';
import ImageDownloader from '../features/imageDownloader/ImageDownloader';
import StyleInspector from '../features/styleInspector/StyleInspector';
import VideoRecorder from '../features/videoRecorder/VideoRecorder';

interface PanelState {
  imageDownloader: { isOpen: boolean; isMinimized: boolean };
  styleInspector: { isOpen: boolean; isMinimized: boolean };
  videoRecorder: { isOpen: boolean; isMinimized: boolean };
}

const PanelManager: React.FC = () => {
  const [panels, setPanels] = useState<PanelState>({
    imageDownloader: { isOpen: false, isMinimized: false },
    styleInspector: { isOpen: false, isMinimized: false },
    videoRecorder: { isOpen: false, isMinimized: false }
  });

  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const message = event.detail;
      switch (message.action) {
        case 'openImageDownloader':
          setPanels(prev => ({ 
            ...prev, 
            imageDownloader: { isOpen: true, isMinimized: false }
          }));
          break;
        case 'openStyleInspector':
          setPanels(prev => ({ 
            ...prev, 
            styleInspector: { isOpen: true, isMinimized: false }
          }));
          break;
        case 'openVideoRecorder':
          setPanels(prev => ({ 
            ...prev, 
            videoRecorder: { isOpen: true, isMinimized: false }
          }));
          break;
      }
    };

    window.addEventListener('frontend-toolbox-message', handleMessage as EventListener);
    return () => window.removeEventListener('frontend-toolbox-message', handleMessage as EventListener);
  }, []);

  const closePanel = (panelName: keyof PanelState) => {
    setPanels(prev => ({ 
      ...prev, 
      [panelName]: { isOpen: false, isMinimized: false }
    }));
  };

  const toggleMinimize = (panelName: keyof PanelState) => {
    setPanels(prev => ({ 
      ...prev, 
      [panelName]: { 
        ...prev[panelName], 
        isMinimized: !prev[panelName].isMinimized 
      }
    }));
  };

  // Calculate positions to avoid overlap and ensure visibility
  const getPanelPosition = (index: number, panelWidth: number = 450) => {
    const padding = 20;
    const baseX = window.innerWidth - panelWidth - padding;
    const baseY = padding;
    const offset = index * 30; // Stagger panels slightly
    
    // Ensure panel is fully visible
    const x = Math.max(padding, baseX - offset);
    const y = baseY + offset;
    
    return { x, y };
  };

  let panelIndex = 0;

  return (
    <>
      {panels.imageDownloader.isOpen && (
        <Panel
          isOpen={true}
          onClose={() => closePanel('imageDownloader')}
          onMinimize={() => toggleMinimize('imageDownloader')}
          title="이미지 다운로더"
          width={450}
          height={600}
          initialPosition={getPanelPosition(panelIndex++, 450)}
          isMinimized={panels.imageDownloader.isMinimized}
        >
          <ImageDownloader
            isOpen={true}
            onClose={() => closePanel('imageDownloader')}
          />
        </Panel>
      )}
      
      {panels.styleInspector.isOpen && (
        <Panel
          isOpen={true}
          onClose={() => closePanel('styleInspector')}
          onMinimize={() => toggleMinimize('styleInspector')}
          title="스타일 인스펙터"
          width={500}
          height={700}
          initialPosition={getPanelPosition(panelIndex++, 500)}
          isMinimized={panels.styleInspector.isMinimized}
        >
          <StyleInspector
            isOpen={true}
            onClose={() => closePanel('styleInspector')}
          />
        </Panel>
      )}
      
      {panels.videoRecorder.isOpen && (
        <Panel
          isOpen={true}
          onClose={() => closePanel('videoRecorder')}
          onMinimize={() => toggleMinimize('videoRecorder')}
          title="비디오 레코더"
          width={400}
          height={500}
          initialPosition={getPanelPosition(panelIndex++, 400)}
          isMinimized={panels.videoRecorder.isMinimized}
        >
          <VideoRecorder
            isOpen={true}
            onClose={() => closePanel('videoRecorder')}
          />
        </Panel>
      )}
    </>
  );
};

export default PanelManager;
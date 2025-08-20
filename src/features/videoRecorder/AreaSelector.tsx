import React, { useState, useCallback, useEffect } from 'react';

interface AreaSelectorProps {
  isVisible: boolean;
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ isVisible, onAreaSelected, onCancel }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelecting) {
      setCurrentPos({ x: e.clientX, y: e.clientY });
    }
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      if (width > 10 && height > 10) {
        // Pass viewport coordinates directly - no screen coordinate conversion
        onAreaSelected({ x, y, width, height });
      }
      setIsSelecting(false);
    }
  }, [isSelecting, startPos, currentPos, onAreaSelected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onCancel]);

  if (!isVisible) return null;

  const selectionStyle = isSelecting ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  } : {};

  return (
    <div 
      className="area-selector-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="area-selector-instructions">
        마우스를 드래그하여 녹화할 영역을 선택하세요 (ESC로 취소)
      </div>
      
      {isSelecting && (
        <div 
          className="area-selection-box"
          style={selectionStyle}
        />
      )}
    </div>
  );
};

export default AreaSelector;
import React, { useState, useRef, useEffect } from 'react';

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  initialPosition?: { x: number; y: number };
  isMinimized?: boolean;
  resizable?: boolean;
  draggable?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  isOpen,
  onClose,
  onMinimize,
  title,
  children,
  width = 400,
  height = 600,
  minWidth = 300,
  minHeight = 400,
  initialPosition = { 
    x: Math.max(20, window.innerWidth - width - 20), 
    y: 20 
  },
  isMinimized = false,
  resizable = true,
  draggable = true
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [minimizedPosition, setMinimizedPosition] = useState<{ x: number; y: number } | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && draggable) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep panel within viewport
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizing && resizable) {
        const newWidth = Math.max(minWidth, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(minHeight, resizeStart.height + (e.clientY - resizeStart.y));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, size, minWidth, minHeight, draggable, resizable]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // 최소화 시 위치 계산
  const calculateMinimizedPosition = () => {
    // 화면 오른쪽 위로 이동 (여백 20px)
    return {
      x: window.innerWidth - 300, // 최소화된 패널 너비(280px) + 여백 고려
      y: 20
    };
  };

  // 실제 위치 계산 (최소화 상태에 따라)
  const actualPosition = isMinimized 
    ? (minimizedPosition || calculateMinimizedPosition())
    : position;

  // 최소화 상태 변경 감지
  React.useEffect(() => {
    if (isMinimized && !minimizedPosition) {
      // 처음 최소화될 때 위치 저장
      setMinimizedPosition(calculateMinimizedPosition());
    } else if (!isMinimized && minimizedPosition) {
      // 복원될 때 최소화 위치 초기화
      setMinimizedPosition(null);
    }
  }, [isMinimized, minimizedPosition]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`frontend-toolbox-panel ${isMinimized ? 'minimized' : ''}`}
      style={{
        position: 'fixed',
        left: `${actualPosition.x}px`,
        top: `${actualPosition.y}px`,
        width: isMinimized ? 'auto' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: 999999,
        userSelect: isDragging ? 'none' : 'auto',
        transition: isMinimized || minimizedPosition ? 'all 0.3s ease' : 'none'
      }}
    >
      <div 
        className="panel-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <div className="panel-title">
          {typeof title === 'string' ? <h3>{title}</h3> : title}
        </div>
        <div className="panel-controls">
          {onMinimize && (
            <button 
              className="panel-control-btn minimize-btn" 
              onClick={onMinimize}
              title={isMinimized ? "복원" : "최소화"}
            >
              {isMinimized ? '□' : '—'}
            </button>
          )}
          <button 
            className="panel-control-btn close-btn" 
            onClick={onClose}
            title="닫기"
          >
            ×
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="panel-content">
            {children}
          </div>
          
          {resizable && (
            <div
              className="panel-resize-handle"
              onMouseDown={handleResizeMouseDown}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '20px',
                height: '20px',
                cursor: 'se-resize',
                background: 'linear-gradient(-45deg, transparent 0%, transparent 40%, #ccc 40%, #ccc 60%, transparent 60%)'
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Panel;
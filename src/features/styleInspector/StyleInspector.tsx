import React, { useState, useEffect } from 'react';
import { StyleData } from '../../types';
import { Button } from '../../components';
import { StyleExtractor } from './styleExtractor';
import { sendMessageToContentScript } from '../../utils/contentScript';

interface StyleInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const StyleInspector: React.FC<StyleInspectorProps> = ({ isOpen, onClose }) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [styleData, setStyleData] = useState<StyleData | null>(null);
  const [activeTab, setActiveTab] = useState<'computed' | 'css' | 'tailwind'>('tailwind');
  const [savedCount, setSavedCount] = useState(0);
  const [savedStyles, setSavedStyles] = useState<any[]>([]);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Listen for style data from background script (storage related)
      const handleBackgroundMessage = (message: any) => {
        if (message.action === 'styleExtracted') {
          setStyleData(message.data);
          setIsInspecting(false);
          // stylesSaved 메시지가 오지 않을 경우를 대비한 fallback
          setTimeout(() => {
            loadSavedStyles();
          }, 500);
        } else if (message.action === 'stylesSaved') {
          // 저장 완료 후 즉시 상태 업데이트
          const { savedStyles } = message.data;
          setSavedStyles([...savedStyles]);
          setSavedCount(savedStyles.length);
        }
      };

      // Listen for direct window events from content script
      const handleWindowMessage = (event: CustomEvent) => {
        const message = event.detail;
        if (message.action === 'hoverInfo') {
          setHoverInfo(message.data);
        } else if (message.action === 'inspectionStopped') {
          setIsInspecting(false);
          setHoverInfo(null);
        }
      };
      
      chrome.runtime.onMessage.addListener(handleBackgroundMessage);
      window.addEventListener('frontend-toolbox-message', handleWindowMessage as EventListener);
      
      // 초기 저장된 스타일 로드
      loadSavedStyles();
      
      return () => {
        chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
        window.removeEventListener('frontend-toolbox-message', handleWindowMessage as EventListener);
      };
    }
  }, [isOpen]);

  const loadSavedStyles = () => {
    chrome.storage.local.get('savedStyles', (result) => {
      const styles = result.savedStyles || [];
      setSavedStyles([...styles]); // 새 배열로 강제 업데이트
      setSavedCount(styles.length);
    });
  };

  const startInspecting = async () => {
    try {
      await chrome.runtime.sendMessage({
        action: 'startStyleInspector'
      });
      setIsInspecting(true);
    } catch (error) {
      console.error('Failed to start style inspector:', error);
      alert((error as Error).message || '스타일 검사기를 시작할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }
  };

  const stopInspecting = async () => {
    try {
      await chrome.runtime.sendMessage({
        action: 'stopStyleInspector'
      });
      setIsInspecting(false);
    } catch (error) {
      console.error('Failed to stop style inspector:', error);
    }
  };

  const copyToClipboard = (text: string, type: string = '') => {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message with toast
      const message = type ? `${type} 복사 완료!` : '복사 완료!';
      StyleExtractor.showCopyToast(message);
    }).catch(err => {
      console.error('Failed to copy:', err);
      StyleExtractor.showCopyToast('복사 실패');
    });
  };

  const clearSavedStyles = () => {
    if (confirm('저장된 모든 스타일을 삭제하시겠습니까?')) {
      chrome.storage.local.set({ savedStyles: [] }, () => {
        setSavedStyles([]);
        setSavedCount(0);
        setStyleData(null);
        alert('저장된 스타일이 모두 삭제되었습니다.');
      });
    }
  };

  const deleteSavedStyle = (styleId: string) => {
    const updatedStyles = savedStyles.filter(style => style.id !== styleId);
    chrome.storage.local.set({ savedStyles: updatedStyles }, () => {
      setSavedStyles(updatedStyles);
      setSavedCount(updatedStyles.length);
    });
  };

  const toggleStyleExpansion = (styleId: string) => {
    const newExpanded = new Set(expandedStyles);
    if (newExpanded.has(styleId)) {
      newExpanded.delete(styleId);
    } else {
      newExpanded.add(styleId);
    }
    setExpandedStyles(newExpanded);
  };

  const renderComputedStyles = () => {
    if (!styleData) return null;

    return (
      <div className="computed-styles">
        {Object.entries(styleData.properties).map(([category, props]) => (
          <div key={category} className="style-category">
            <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
            <div className="style-properties">
              {Object.entries(props).map(([prop, value]) => (
                <div key={prop} className="style-property">
                  <span className="property-name">{prop}:</span>
                  <span className="property-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCSS = () => {
    if (!styleData) return null;
    
    const css = StyleExtractor.generateCSS(styleData);
    
    return (
      <div className="css-output">
        <div className="code-header">
          <Button onClick={() => copyToClipboard(css, 'CSS')} size="small">
            복사
          </Button>
        </div>
        <pre className="code-block">{css}</pre>
      </div>
    );
  };

  const renderTailwind = () => {
    if (!styleData) return null;
    
    const tailwindClasses = StyleExtractor.generateTailwindClasses(styleData);
    
    return (
      <div className="tailwind-output">
        <div className="code-header">
          <Button onClick={() => copyToClipboard(tailwindClasses, 'Tailwind')} size="small">
            복사
          </Button>
        </div>
        <div className="tailwind-classes">
          <div className="class-attribute">
            className="{tailwindClasses}"
          </div>
          <div className="class-list">
            {tailwindClasses.split(' ').map((className, index) => (
              <span key={index} className="tailwind-class">
                {className}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="style-inspector">
      <div className="style-inspector-fixed-header">
        <div className="inspector-controls">
          {!isInspecting ? (
            <Button onClick={startInspecting} variant="primary">
              요소 검사 시작
            </Button>
          ) : (
            <Button onClick={stopInspecting} variant="danger">
              검사 중지 (ESC)
            </Button>
          )}
          
          {savedCount > 0 && (
            <Button onClick={clearSavedStyles} variant="secondary">
              저장 초기화 ({savedCount}개)
            </Button>
          )}
        </div>
      </div>

      <div className="style-content-scrollable">
        {isInspecting && (
          <div className="inspector-guide">
            <p>🎯 검사할 요소 위에 마우스를 올려보세요</p>
            <p>⌨️ <strong>Shift</strong>로 스타일 저장 • <strong>ESC</strong>로 종료</p>
          </div>
        )}

        {isInspecting && hoverInfo && (
          <div className="hover-info-panel">
            <div className="hover-element-info">
              <div className="element-selector">{hoverInfo.selector}</div>
              <div className="element-tag">
                {hoverInfo.tagName}{hoverInfo.className ? '.' + hoverInfo.className : ''}
              </div>
              <div className="element-properties">
                <div className="property-item">
                  <span className="property-label">Width:</span>
                  <span className="property-value">{hoverInfo.width}px</span>
                </div>
                <div className="property-item">
                  <span className="property-label">Height:</span>
                  <span className="property-value">{hoverInfo.height}px</span>
                </div>
                <div className="property-item">
                  <span className="property-label">Display:</span>
                  <span className="property-value">{hoverInfo.display}</span>
                </div>
                <div className="property-item">
                  <span className="property-label">Position:</span>
                  <span className="property-value">{hoverInfo.position}</span>
                </div>
              </div>
            </div>
            
            {hoverInfo && (
              <div className="save-preview-section">
                <h5>💾 Shift로 저장될 내용</h5>
                <div className="preview-content">
                  <div className="preview-tailwind">
                    <strong>Tailwind:</strong>
                    <div className="preview-code">
                      {hoverInfo.previewTailwind || '생성 중...'}
                    </div>
                  </div>
                  <div className="preview-css">
                    <strong>CSS:</strong>
                    <pre className="preview-css-code">
                      {hoverInfo.previewCSS || '생성 중...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {styleData && (
          <div className="style-details">
            <div className="element-info">
              <h3>선택된 요소: {styleData.selector}</h3>
            </div>

            <div className="style-tabs">
              <button
                className={`tab ${activeTab === 'tailwind' ? 'active' : ''}`}
                onClick={() => setActiveTab('tailwind')}
              >
                Tailwind
              </button>
              <button
                className={`tab ${activeTab === 'css' ? 'active' : ''}`}
                onClick={() => setActiveTab('css')}
              >
                CSS
              </button>
              <button
                className={`tab ${activeTab === 'computed' ? 'active' : ''}`}
                onClick={() => setActiveTab('computed')}
              >
                계산된 스타일
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'tailwind' && renderTailwind()}
              {activeTab === 'css' && renderCSS()}
              {activeTab === 'computed' && renderComputedStyles()}
            </div>
          </div>
        )}

        {!styleData && !isInspecting && (
          <div className="no-selection">
            요소 검사를 시작하여 스타일 정보를 확인하세요.
          </div>
        )}

        {savedStyles.length > 0 && (
          <div className="saved-styles-section">
            <h4>저장된 스타일 ({savedStyles.length}개)</h4>
            <div className="saved-styles-list">
              {savedStyles.map((style, index) => (
                <div key={`${style.id}-${index}-${savedStyles.length}`} className="saved-style-item">
                  <div className="saved-style-header">
                    <div className="saved-style-info">
                      <span 
                        className="saved-style-selector"
                        title={style.selector}
                      >
                        {style.selector}
                      </span>
                      <button 
                        className="expand-toggle"
                        onClick={() => toggleStyleExpansion(style.id)}
                        title={expandedStyles.has(style.id) ? "CSS 숨기기" : "CSS 보기"}
                      >
                        {expandedStyles.has(style.id) ? '▼' : '▶'} CSS
                      </button>
                    </div>
                    <div className="saved-style-actions">
                      <Button onClick={() => copyToClipboard(style.css, 'CSS')} size="small">
                        CSS 복사
                      </Button>
                      <Button onClick={() => deleteSavedStyle(style.id)} size="small" variant="danger">
                        삭제
                      </Button>
                    </div>
                  </div>
                  <div className="saved-style-tailwind">
                    <div 
                      className="tailwind-classes-display"
                      onClick={() => copyToClipboard(style.tailwind, 'Tailwind')}
                      title="클릭하여 Tailwind 클래스 복사"
                    >
                      className="{style.tailwind}"
                    </div>
                  </div>
                  {expandedStyles.has(style.id) && (
                    <div className="saved-style-preview">
                      <pre className="saved-style-css">{style.css}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleInspector;
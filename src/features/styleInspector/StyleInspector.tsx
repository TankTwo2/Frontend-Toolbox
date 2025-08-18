import React, { useState, useEffect } from 'react';
import { StyleData } from '../../types';
import { Button, Modal } from '../../components';
import { StyleExtractor } from './styleExtractor';
import { sendMessageToContentScript } from '../../utils/contentScript';

interface StyleInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const StyleInspector: React.FC<StyleInspectorProps> = ({ isOpen, onClose }) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [styleData, setStyleData] = useState<StyleData | null>(null);
  const [activeTab, setActiveTab] = useState<'computed' | 'css' | 'tailwind'>('computed');

  useEffect(() => {
    if (isOpen) {
      // Listen for style data from content script
      const handleMessage = (message: any) => {
        if (message.action === 'styleExtracted') {
          setStyleData(message.data);
          setIsInspecting(false);
        }
      };
      
      chrome.runtime.onMessage.addListener(handleMessage);
      
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, [isOpen]);

  const startInspecting = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendMessageToContentScript(tab.id, {
          action: 'startStyleInspector'
        });
        setIsInspecting(true);
      }
    } catch (error) {
      console.error('Failed to start style inspector:', error);
      alert('스타일 검사기를 시작할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }
  };

  const stopInspecting = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendMessageToContentScript(tab.id, {
          action: 'stopStyleInspector'
        });
        setIsInspecting(false);
      }
    } catch (error) {
      console.error('Failed to stop style inspector:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const saveStyle = () => {
    if (!styleData) return;
    
    // Save to chrome storage
    chrome.storage.local.get('savedStyles', (result) => {
      const savedStyles = result.savedStyles || [];
      savedStyles.push({
        id: Date.now(),
        selector: styleData.selector,
        properties: styleData.properties,
        timestamp: new Date().toISOString()
      });
      chrome.storage.local.set({ savedStyles });
    });
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
          <Button onClick={() => copyToClipboard(css)} size="small">
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
          <Button onClick={() => copyToClipboard(tailwindClasses)} size="small">
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
    <Modal isOpen={isOpen} onClose={onClose} title="스타일 검사기" size="large">
      <div className="style-inspector">
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
          
          {styleData && (
            <Button onClick={saveStyle} variant="secondary">
              스타일 저장
            </Button>
          )}
        </div>

        {isInspecting && (
          <div className="inspector-guide">
            <p>🎯 검사할 요소 위에 마우스를 올려보세요</p>
            <p>⌨️ <strong>Enter</strong>로 스타일 저장 • <strong>ESC</strong>로 종료</p>
          </div>
        )}

        {styleData && (
          <div className="style-details">
            <div className="element-info">
              <h3>선택된 요소: {styleData.selector}</h3>
            </div>

            <div className="style-tabs">
              <button
                className={`tab ${activeTab === 'computed' ? 'active' : ''}`}
                onClick={() => setActiveTab('computed')}
              >
                계산된 스타일
              </button>
              <button
                className={`tab ${activeTab === 'css' ? 'active' : ''}`}
                onClick={() => setActiveTab('css')}
              >
                CSS
              </button>
              <button
                className={`tab ${activeTab === 'tailwind' ? 'active' : ''}`}
                onClick={() => setActiveTab('tailwind')}
              >
                Tailwind
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'computed' && renderComputedStyles()}
              {activeTab === 'css' && renderCSS()}
              {activeTab === 'tailwind' && renderTailwind()}
            </div>
          </div>
        )}

        {!styleData && !isInspecting && (
          <div className="no-selection">
            요소 검사를 시작하여 스타일 정보를 확인하세요.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StyleInspector;
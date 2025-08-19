import React, { useState, useEffect } from 'react';
import { ImageData } from '../../types';
import { Button, Modal } from '../../components';
import { ImageCollector } from './imageCollector';
import { formatFileSize } from '../../utils/helpers';
import { sendMessageToContentScript } from '../../utils/contentScript';

interface ImageDownloaderProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImageDownloader: React.FC<ImageDownloaderProps> = ({ isOpen, onClose }) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter] = useState({
    minWidth: 0,
    minHeight: 0,
    type: 'all' as 'all' | 'img' | 'background' | 'svg'
  });

  useEffect(() => {
    if (isOpen) {
      collectImages();
    }
  }, [isOpen]);

  const collectImages = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const response = await sendMessageToContentScript(tab.id, {
          action: 'getImages'
        });
        setImages(response.images || []);
      }
    } catch (error) {
      console.error('Failed to collect images:', error);
      alert((error as Error).message || '이미지를 수집할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }
    setLoading(false);
  };

  const filteredImages = images.filter(img => {
    if (filter.type !== 'all' && img.type !== filter.type) return false;
    if (img.width && img.width < filter.minWidth) return false;
    if (img.height && img.height < filter.minHeight) return false;
    return true;
  });

  const toggleImageSelection = (url: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedImages(newSelection);
  };

  const selectAll = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.url)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const downloadSelected = async () => {
    const imagesToDownload = filteredImages.filter(img => selectedImages.has(img.url));
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendMessageToContentScript(tab.id, {
          action: 'downloadImages',
          data: { images: imagesToDownload }
        });
      }
    } catch (error) {
      console.error('Failed to download images:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const downloadSingle = async (image: ImageData) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendMessageToContentScript(tab.id, {
          action: 'downloadImage',
          data: { image }
        });
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const modalTitle = (
    <div className="image-downloader-header">
      <div className="selection-controls">
        <Button onClick={selectAll} size="small">전체 선택</Button>
        <Button onClick={deselectAll} size="small" variant="secondary">전체 해제</Button>
        <Button 
          size='small'
          onClick={downloadSelected} 
          disabled={selectedImages.size === 0}
          variant="primary"
        >
          선택된 이미지 다운로드 ({selectedImages.size})
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="large">
      <div className="image-downloader">

        {loading ? (
          <div className="loading">이미지를 수집하는 중...</div>
        ) : (
          <div className="image-grid">
            {filteredImages.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className={`image-item ${selectedImages.has(image.url) ? 'selected' : ''}`}
              >
                <div className="image-preview">
                  <img
                    src={image.src}
                    alt={image.alt || `Image ${index + 1}`}
                    loading="lazy"
                    onClick={() => toggleImageSelection(image.url)}
                  />
                  <div className="image-overlay">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.url)}
                      onChange={() => toggleImageSelection(image.url)}
                    />
                  </div>
                </div>
                <div className="image-info">
                  <div className="image-dimensions">
                    {image.width} × {image.height}
                  </div>
                  {image.size && (
                    <div className="image-size">
                      {formatFileSize(image.size)}
                    </div>
                  )}
                  <div className="image-type">{image.type.toUpperCase()}</div>
                  <Button
                    onClick={() => downloadSingle(image)}
                    size="small"
                    variant="secondary"
                  >
                    다운로드
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredImages.length === 0 && (
          <div className="no-images">
            조건에 맞는 이미지가 없습니다.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImageDownloader;
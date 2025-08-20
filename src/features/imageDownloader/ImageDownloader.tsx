import React, { useState, useEffect } from 'react';
import { ImageData } from '../../types';
import { Button } from '../../components';
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
  const [activeFilter, setActiveFilter] = useState('all');

  // 각 타입별 이미지 개수 계산
  const getImageCount = (filterType: string) => {
    if (filterType === 'all') return images.length;
    if (filterType === 'jpeg') {
      return images.filter(img => img.type === 'jpeg').length;
    }
    if (filterType === 'png') {
      return images.filter(img => img.type === 'png').length;
    }
    if (filterType === 'gif') {
      return images.filter(img => img.type === 'gif').length;
    }
    if (filterType === 'webp') {
      return images.filter(img => img.type === 'webp').length;
    }
    if (filterType === 'background') {
      return images.filter(img => 
        img.type === 'background' || 
        img.type.endsWith('-bg')
      ).length;
    }
    return images.filter(img => img.type === filterType).length;
  };

  // 실제로 존재하는 타입만 필터 옵션에 포함
  const getAvailableFilterOptions = () => {
    const allOptions = [
      { key: 'all', label: 'ALL' },
      { key: 'jpeg', label: 'JPEG/JPG' },
      { key: 'png', label: 'PNG' },
      { key: 'gif', label: 'GIF' },
      { key: 'webp', label: 'WebP' },
      { key: 'svg', label: 'SVG' },
      { key: 'background', label: 'Background' }
    ];

    // 이미지가 없으면 ALL만 표시
    if (images.length === 0) return [allOptions[0]];

    // 실제로 존재하는 타입만 필터링
    return allOptions.filter(option => {
      if (option.key === 'all') return true;
      return getImageCount(option.key) > 0;
    });
  };

  const filterOptions = getAvailableFilterOptions();

  useEffect(() => {
    if (isOpen) {
      collectImages();
    }
  }, [isOpen]);

  const collectImages = async () => {
    setLoading(true);
    try {
      // Content script에서 직접 실행되므로 바로 이미지 수집
      const response = await chrome.runtime.sendMessage({
        action: 'getImages'
      });
      setImages(response.images || []);
    } catch (error) {
      console.error('Failed to collect images:', error);
      alert((error as Error).message || '이미지를 수집할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }
    setLoading(false);
  };

  const filteredImages = images.filter(img => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'background') {
      // 모든 배경 이미지 (타입이 'background'이거나 '-bg'로 끝나는 것들)
      return img.type === 'background' || img.type.endsWith('-bg');
    }
    // 특정 타입 필터링
    return img.type === activeFilter;
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
      await chrome.runtime.sendMessage({
        action: 'downloadImages',
        data: { images: imagesToDownload }
      });
    } catch (error) {
      console.error('Failed to download images:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const downloadSingle = async (image: ImageData) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'downloadImage',
        data: { image }
      });
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="image-downloader">
      <div className="image-downloader-fixed-header">
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
        
        <div className="filter-controls">
          {filterOptions.map(option => {
            const count = getImageCount(option.key);
            return (
              <button
                key={option.key}
                className={`filter-btn ${activeFilter === option.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(option.key)}
              >
                {option.label} <span className="filter-count">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="image-content-scrollable">
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
    </div>
  );
};

export default ImageDownloader;
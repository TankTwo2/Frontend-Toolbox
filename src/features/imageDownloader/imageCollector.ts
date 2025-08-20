import { ImageData } from '../../types';
import { getImageDimensions, getFileSize, isValidUrl } from '../../utils/helpers';

export class ImageCollector {
  static async collectImages(): Promise<ImageData[]> {
    const images: ImageData[] = [];
    const imageUrls = new Set<string>();

    // Helper function to get image type from URL
    const getImageType = (url: string): string => {
      const urlLower = url.toLowerCase();
      if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpeg';
      if (urlLower.includes('.png')) return 'png';
      if (urlLower.includes('.gif')) return 'gif';
      if (urlLower.includes('.webp')) return 'webp';
      if (urlLower.includes('.bmp')) return 'bmp';
      if (urlLower.includes('.tiff') || urlLower.includes('.tif')) return 'tiff';
      if (urlLower.includes('.ico')) return 'ico';
      if (urlLower.includes('.avif')) return 'avif';
      // 확장자로 판단할 수 없는 경우 기본값
      return 'img';
    };

    // Collect img tags
    const imgElements = document.querySelectorAll('img');
    for (const img of imgElements) {
      const src = img.src || img.dataset.src;
      if (src && isValidUrl(src) && !imageUrls.has(src)) {
        imageUrls.add(src);
        images.push({
          url: src,
          src: src,
          alt: img.alt,
          width: img.naturalWidth || undefined,
          height: img.naturalHeight || undefined,
          type: getImageType(src)
        });
      }
    }

    // Collect background images
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const computed = window.getComputedStyle(element);
      const backgroundImage = computed.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        const matches = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (matches && matches[1]) {
          const url = matches[1];
          if (isValidUrl(url) && !imageUrls.has(url)) {
            imageUrls.add(url);
            const imageType = getImageType(url);
            images.push({
              url: url,
              src: url,
              type: imageType === 'img' ? 'background' : `${imageType}-bg` // 배경이미지는 타입뒤에 -bg 붙임
            });
          }
        }
      }
    }

    // Collect SVG elements
    const svgElements = document.querySelectorAll('svg');
    for (let i = 0; i < svgElements.length; i++) {
      const svg = svgElements[i];
      if (svg.outerHTML) {
        // SVG를 data URL로 변환 (더 안정적)
        const svgData = svg.outerHTML;
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        
        // SVG 식별을 위한 데이터 속성 추가
        svg.setAttribute('data-svg-index', i.toString());
        
        const rect = svg.getBoundingClientRect();
        images.push({
          url: svgDataUrl,
          src: svgDataUrl,
          type: 'svg',
          width: Math.max(svg.clientWidth, rect.width, 50) || 100,
          height: Math.max(svg.clientHeight, rect.height, 50) || 100,
          alt: `SVG-${i + 1}` // SVG 식별용
        });
      }
    }

    // Enrich with additional data
    for (const image of images) {
      try {
        if (image.type === 'svg') {
          // SVG는 data URL이므로 크기 정보를 다르게 처리
          if (!image.width || image.width < 10) image.width = 100;
          if (!image.height || image.height < 10) image.height = 100;
          // SVG data URL의 대략적인 크기 계산
          image.size = Math.round(image.src.length * 0.75); // base64 디코딩 후 예상 크기
        } else {
          const dimensions = await getImageDimensions(image.src);
          if (!image.width) image.width = dimensions.width;
          if (!image.height) image.height = dimensions.height;
          
          // 파일 크기 가져오기 시도, 실패시 0으로 설정
          try {
            image.size = await getFileSize(image.src);
          } catch {
            image.size = 0; // CORS 오류 등으로 크기를 알 수 없는 경우
          }
        }
      } catch (error) {
        console.warn('Failed to get image metadata:', error);
        // 메타데이터를 가져올 수 없어도 이미지는 유지
        if (!image.width) image.width = 100;
        if (!image.height) image.height = 100;
        if (!image.size) image.size = 0;
      }
    }

    // 최소 크기 필터링을 더 관대하게 적용
    return images.filter(img => 
      img.width && img.height && 
      img.width >= 16 && img.height >= 16 // 16x16 이상만 표시
    );
  }

  static async downloadImage(image: ImageData, customName?: string): Promise<void> {
    try {
      let blob: Blob;
      let filename = customName || this.generateFilename(image);

      if (image.type === 'svg') {
        // SVG의 경우 blob URL에서 SVG 데이터 추출
        if (image.src.startsWith('blob:')) {
          const response = await fetch(image.src);
          blob = await response.blob();
        } else {
          // 인라인 SVG의 경우
          const svgElement = document.querySelector(`svg[data-url="${image.src}"]`) as SVGElement;
          if (svgElement) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            blob = new Blob([svgData], { type: 'image/svg+xml' });
          } else {
            throw new Error('SVG element not found');
          }
        }
        
        // SVG 파일명 확장자 수정
        if (!filename.endsWith('.svg')) {
          filename = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '.svg');
          if (!filename.includes('.')) {
            filename += '.svg';
          }
        }
      } else {
        // 일반 이미지의 경우
        // 크기가 0이거나 CORS 제한이 있는 경우 background script를 통해 다운로드
        if (image.size === 0 || !image.src.startsWith('blob:')) {
          try {
            const response = await chrome.runtime.sendMessage({
              action: 'download',
              url: image.src,
              filename: filename
            });
            
            if (response.error) {
              throw new Error(response.error);
            }
            return; // 성공시 함수 종료
          } catch (bgError) {
            console.warn('Background download failed, trying fetch:', bgError);
            // Background 다운로드 실패시 fetch 시도
          }
        }
        
        try {
          const response = await fetch(image.src, { mode: 'cors' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          blob = await response.blob();
        } catch (fetchError) {
          // CORS 오류 등의 경우 background script를 통해 다운로드
          try {
            const response = await chrome.runtime.sendMessage({
              action: 'download',
              url: image.src,
              filename: filename
            });
            
            if (response.error) {
              throw new Error(response.error);
            }
            return;
          } catch (bgError) {
            console.error('All download methods failed:', bgError);
            throw new Error(`다운로드 실패: ${fetchError.message || fetchError}`);
          }
        }
      }
      
      const url = URL.createObjectURL(blob);
      
      if (chrome?.downloads) {
        chrome.downloads.download({
          url: url,
          filename: filename
        });
      } else {
        // Fallback for content script
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }

  static async downloadImages(images: ImageData[]): Promise<void> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < images.length; i++) {
      try {
        await this.downloadImage(images[i]);
        if (i < images.length - 1) {
          await delay(500); // Prevent overwhelming the download manager
        }
      } catch (error) {
        console.error(`Failed to download image ${i + 1}:`, error);
      }
    }
  }

  private static generateFilename(image: ImageData): string {
    if (image.type === 'svg') {
      // SVG의 경우 alt 속성을 사용하거나 기본 이름 생성
      const baseName = image.alt || 'svg-image';
      return `${baseName}.svg`;
    }

    if (image.src.startsWith('blob:')) {
      // Blob URL의 경우 기본 이름 생성
      const baseName = image.alt || 'image';
      const extension = image.type === 'background' ? 'jpg' : 'png';
      return `${baseName}.${extension}`;
    }

    try {
      const url = new URL(image.src);
      const pathname = url.pathname;
      let filename = pathname.split('/').pop() || 'image';
      
      // If no extension, try to determine from URL or use appropriate default
      if (!filename.includes('.')) {
        let extension = this.getImageExtension(image.src);
        if (!extension) {
          extension = image.type === 'background' ? 'jpg' : 'png';
        }
        return `${filename}.${extension}`;
      }
      
      return filename;
    } catch {
      // URL 파싱 실패시 기본 이름
      const baseName = image.alt || 'image';
      const extension = image.type === 'background' ? 'jpg' : 'png';
      return `${baseName}.${extension}`;
    }
  }

  private static getImageExtension(url: string): string | null {
    const match = url.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)(\?|$)/i);
    return match ? match[1].toLowerCase() : null;
  }
}
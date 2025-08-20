import { StyleData } from '../../types';
import { categorizeCSS, getElementSelector } from '../../utils/helpers';

export class StyleExtractor {
  private static highlightElement: HTMLElement | null = null;
  private static overlayElement: HTMLElement | null = null;

  static createOverlay(): void {
    if (this.overlayElement) return;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'frontend-toolbox-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      pointer-events: none;
      display: none;
    `;


    this.highlightElement = document.createElement('div');
    this.highlightElement.id = 'frontend-toolbox-highlight';
    this.highlightElement.style.cssText = `
      position: absolute;
      background: rgba(59, 130, 246, 0.2);
      border: 2px solid #3b82f6;
      pointer-events: none;
      z-index: 1000000;
      display: none;
      transition: all 0.1s ease;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
    `;

    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.highlightElement);
  }

  static removeOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }

  static startInspecting(): void {
    this.createOverlay();
    this.overlayElement!.style.display = 'block';
    document.body.style.cursor = 'crosshair';

    document.addEventListener('mouseover', this.handleMouseOver);
    // window에서 더 높은 우선순위로 ESC 키 처리
    window.addEventListener('keydown', this.handleKeyDown, { capture: true, passive: false });
    
    // 페이지 클릭 방지 (검사 중지 버튼은 제외)
    document.addEventListener('click', this.preventClick, true);
  }

  static stopInspecting(): void {
    this.removeOverlay();
    document.body.style.cursor = '';

    document.removeEventListener('mouseover', this.handleMouseOver);
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    document.removeEventListener('click', this.preventClick, true);
  }

  private static handleMouseOver = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!target || target.id?.includes('frontend-toolbox')) return;

    this.currentTarget = target;
    this.highlightTarget(target);
    this.showHoverInfo(target);
  };

  private static preventClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  private static currentTarget: HTMLElement | null = null;

  private static handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.stopInspecting();
      
      // React 컴포넌트에 검사 중지 상태 알림
      window.dispatchEvent(new CustomEvent('frontend-toolbox-message', {
        detail: {
          action: 'inspectionStopped'
        }
      }));
    } else if (event.key === 'Shift' && this.currentTarget) {
      event.preventDefault();
      event.stopPropagation();
      
      const styleData = this.extractStyles(this.currentTarget);
      
      // Send style data to popup
      chrome.runtime.sendMessage({
        action: 'styleExtracted',
        data: styleData
      });

      // 저장 완료 피드백
      this.showSaveToast();
    }
  };

  private static highlightTarget(element: HTMLElement): void {
    if (!this.highlightElement) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    this.highlightElement.style.display = 'block';
    this.highlightElement.style.top = `${rect.top + scrollTop}px`;
    this.highlightElement.style.left = `${rect.left + scrollLeft}px`;
    this.highlightElement.style.width = `${rect.width}px`;
    this.highlightElement.style.height = `${rect.height}px`;
  }

  private static showHoverInfo(element: HTMLElement): void {
    // 별도 툴팁 대신 패널로 정보 전송
    const selector = getElementSelector(element);
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // 기본 정보 먼저 설정
    let hoverInfo = {
      selector,
      tagName: element.tagName.toLowerCase(),
      className: element.className ? element.className.split(' ').join('.') : '',
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      display: computed.display,
      position: computed.position,
      previewCSS: '',
      previewTailwind: ''
    };

    // 미리보기 생성 시도
    try {
      const styleData = this.extractStyles(element);
      hoverInfo.previewCSS = StyleExtractor.generateCSS(styleData);
      hoverInfo.previewTailwind = StyleExtractor.generateTailwindClasses(styleData);
    } catch (error) {
      console.error('Error generating preview:', error);
      // 기본값 유지 (빈 문자열)
    }

    // Send hover info to StyleInspector panel
    
    // content script 내에서 직접 이벤트 전달
    window.dispatchEvent(new CustomEvent('frontend-toolbox-message', {
      detail: {
        action: 'hoverInfo',
        data: hoverInfo
      }
    }));
  }

  private static showSaveToast(): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 600;
      z-index: 1000002;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: fadeInOut 2s ease-in-out;
    `;
    
    toast.textContent = '✓ 스타일이 저장되었습니다!';
    
    // CSS 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 2000);
  }

  static showCopyToast(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 1000002;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      animation: copyFadeInOut 1.5s ease-in-out;
    `;
    
    toast.textContent = message;
    
    // CSS 애니메이션 추가
    if (!document.getElementById('copy-toast-style')) {
      const style = document.createElement('style');
      style.id = 'copy-toast-style';
      style.textContent = `
        @keyframes copyFadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 1500);
  }

  static extractStyles(element: HTMLElement): StyleData {
    const computed = window.getComputedStyle(element);
    const selector = getElementSelector(element);
    const properties = categorizeCSS(computed);
    const tailwindClasses = this.extractTailwindClasses(element);

    return {
      selector,
      computed,
      properties,
      tailwindClasses
    };
  }

  private static extractTailwindClasses(element: HTMLElement): string[] {
    const classList = Array.from(element.classList);
    
    // Common Tailwind class patterns
    const tailwindPatterns = [
      /^(m|p)(t|r|b|l|x|y)?-\d+$/,  // margin, padding
      /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/,  // font sizes
      /^text-(left|center|right|justify)$/,  // text alignment
      /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,  // font weights
      /^bg-(transparent|current|black|white|gray|red|yellow|green|blue|indigo|purple|pink)-?\d*$/,  // backgrounds
      /^text-(transparent|current|black|white|gray|red|yellow|green|blue|indigo|purple|pink)-?\d*$/,  // text colors
      /^border-(transparent|current|black|white|gray|red|yellow|green|blue|indigo|purple|pink)-?\d*$/,  // border colors
      /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,  // border radius
      /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/,  // shadows
      /^flex(-1|-auto|-initial|-none)?$/,  // flex
      /^grid(-cols-\d+)?$/,  // grid
      /^w-(\d+|auto|full|screen)$/,  // width
      /^h-(\d+|auto|full|screen)$/,  // height
      /^(min|max)-(w|h)-(\d+|auto|full|screen)$/,  // min/max width/height
    ];

    return classList.filter(className => 
      tailwindPatterns.some(pattern => pattern.test(className))
    );
  }

  static generateCSS(styleData: StyleData): string {
    const { properties } = styleData;
    let css = `${styleData.selector} {\n`;

    // Add important properties first
    const importantProps = ['display', 'position', 'width', 'height', 'color', 'background-color', 'font-size', 'font-family'];
    
    importantProps.forEach(prop => {
      Object.entries(properties).forEach(([category, props]) => {
        if (props[prop]) {
          css += `  ${prop}: ${props[prop]};\n`;
        }
      });
    });

    // Add other properties by category
    Object.entries(properties).forEach(([category, props]) => {
      Object.entries(props).forEach(([prop, value]) => {
        if (!importantProps.includes(prop) && value && value !== 'initial' && value !== 'normal') {
          css += `  ${prop}: ${value};\n`;
        }
      });
    });

    css += '}';
    return css;
  }

  static generateTailwindClasses(styleData: StyleData): string {
    const { properties, tailwindClasses } = styleData;
    const classes: string[] = [...(tailwindClasses || [])];

    // Convert common CSS properties to Tailwind classes
    const cssToTailwind: Record<string, (value: string) => string | null> = {
      'display': (value) => {
        const map: Record<string, string> = {
          'block': 'block',
          'inline': 'inline',
          'inline-block': 'inline-block',
          'flex': 'flex',
          'inline-flex': 'inline-flex',
          'grid': 'grid',
          'hidden': 'hidden'
        };
        return map[value] || null;
      },
      'text-align': (value) => {
        const map: Record<string, string> = {
          'left': 'text-left',
          'center': 'text-center',
          'right': 'text-right',
          'justify': 'text-justify'
        };
        return map[value] || null;
      },
      'font-weight': (value) => {
        const map: Record<string, string> = {
          '100': 'font-thin',
          '200': 'font-extralight',
          '300': 'font-light',
          '400': 'font-normal',
          '500': 'font-medium',
          '600': 'font-semibold',
          '700': 'font-bold',
          '800': 'font-extrabold',
          '900': 'font-black'
        };
        return map[value] || null;
      }
    };

    Object.entries(properties).forEach(([category, props]) => {
      Object.entries(props).forEach(([prop, value]) => {
        const converter = cssToTailwind[prop];
        if (converter) {
          const tailwindClass = converter(value);
          if (tailwindClass && !classes.includes(tailwindClass)) {
            classes.push(tailwindClass);
          }
        }
      });
    });

    return classes.join(' ');
  }
}
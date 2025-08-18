import { ImageData, StyleData } from '../types';
import { CSS_PROPERTIES } from './constants';

export const downloadFile = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = src;
  });
};

export const getFileSize = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const categorizeCSS = (computed: CSSStyleDeclaration): StyleData['properties'] => {
  const result: StyleData['properties'] = {
    layout: {},
    typography: {},
    colors: {},
    spacing: {},
    others: {}
  };

  for (let i = 0; i < computed.length; i++) {
    const property = computed[i];
    const value = computed.getPropertyValue(property);

    if ((CSS_PROPERTIES.LAYOUT as readonly string[]).includes(property)) {
      result.layout[property] = value;
    } else if ((CSS_PROPERTIES.TYPOGRAPHY as readonly string[]).includes(property)) {
      result.typography[property] = value;
    } else if ((CSS_PROPERTIES.COLORS as readonly string[]).includes(property)) {
      result.colors[property] = value;
    } else if ((CSS_PROPERTIES.SPACING as readonly string[]).includes(property)) {
      result.spacing[property] = value;
    } else {
      result.others[property] = value;
    }
  }

  return result;
};

export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getElementSelector = (element: HTMLElement): string => {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  const tagName = element.tagName.toLowerCase();
  const parent = element.parentElement;
  
  if (!parent) {
    return tagName;
  }
  
  const siblings = Array.from(parent.children).filter(
    child => child.tagName.toLowerCase() === tagName
  );
  
  if (siblings.length > 1) {
    const index = siblings.indexOf(element) + 1;
    return `${tagName}:nth-of-type(${index})`;
  }
  
  return tagName;
};
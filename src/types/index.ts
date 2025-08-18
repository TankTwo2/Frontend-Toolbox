export interface ImageData {
  url: string;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  type: 'img' | 'background' | 'svg';
}

export interface StyleData {
  selector: string;
  computed: CSSStyleDeclaration;
  properties: {
    layout: Record<string, string>;
    typography: Record<string, string>;
    colors: Record<string, string>;
    spacing: Record<string, string>;
    others: Record<string, string>;
  };
  tailwindClasses?: string[];
}

export interface RecordingData {
  id: string;
  name: string;
  duration: number;
  size: number;
  blob: Blob;
  createdAt: Date;
}

export interface ToolboxMessage {
  action: string;
  data?: any;
}

export interface FeatureState {
  imageDownloader: {
    isActive: boolean;
    images: ImageData[];
    selectedImages: string[];
  };
  styleInspector: {
    isActive: boolean;
    selectedElement: HTMLElement | null;
    styleData: StyleData | null;
  };
  videoRecorder: {
    isActive: boolean;
    isRecording: boolean;
    recordings: RecordingData[];
  };
}

export type FeatureName = keyof FeatureState;
export const MESSAGES = {
  SHOW_TOOLBOX: 'showToolbox',
  ACTIVATE_FEATURE: 'activateFeature',
  DEACTIVATE_FEATURE: 'deactivateFeature',
  GET_IMAGES: 'getImages',
  DOWNLOAD_IMAGE: 'downloadImage',
  DOWNLOAD_IMAGES: 'downloadImages',
  GET_ELEMENT_STYLE: 'getElementStyle',
  START_RECORDING: 'startRecording',
  STOP_RECORDING: 'stopRecording',
  TOGGLE_STYLE_INSPECTOR: 'toggleStyleInspector',
} as const;

export const FEATURES = {
  IMAGE_DOWNLOADER: 'imageDownloader',
  STYLE_INSPECTOR: 'styleInspector',
  VIDEO_RECORDER: 'videoRecorder',
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'frontend_toolbox_settings',
  RECORDINGS: 'frontend_toolbox_recordings',
  SAVED_STYLES: 'frontend_toolbox_saved_styles',
} as const;

export const CSS_PROPERTIES = {
  LAYOUT: [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'float', 'clear', 'overflow', 'overflow-x', 'overflow-y', 'visibility'
  ],
  TYPOGRAPHY: [
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
    'white-space', 'word-wrap', 'word-break'
  ],
  COLORS: [
    'color', 'background-color', 'background-image', 'background-position',
    'background-repeat', 'background-size', 'border-color', 'box-shadow',
    'text-shadow', 'opacity'
  ],
  SPACING: [
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'
  ],
} as const;
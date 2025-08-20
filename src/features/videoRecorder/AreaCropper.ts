export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class AreaCropper {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private cropArea: CropArea;
  private animationFrameId: number | null = null;
  private fps: number;
  private frameInterval: number;
  private lastFrameTime: number = 0;

  constructor(stream: MediaStream, cropArea: CropArea, fps: number = 30) {
    this.cropArea = cropArea;
    this.fps = fps;
    this.frameInterval = 1000 / fps; // ms per frame
    
    // Create video element to display the source stream
    this.video = document.createElement('video');
    this.video.srcObject = stream;
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    // Create canvas for cropping
    this.canvas = document.createElement('canvas');
    this.canvas.width = cropArea.width;
    this.canvas.height = cropArea.height;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  async getCroppedStream(): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      this.video.onerror = (e) => {
        console.error('AreaCropper - Video error:', e);
        reject(new Error('Video failed to load'));
      };

      this.video.onloadedmetadata = () => {
        try {
          // Get actual video dimensions
          const videoWidth = this.video.videoWidth;
          const videoHeight = this.video.videoHeight;
          
          
          if (videoWidth === 0 || videoHeight === 0) {
            reject(new Error('Invalid video dimensions'));
            return;
          }

          // Force video to play
          this.video.play().catch(err => {
            console.error('AreaCropper - Video play() failed:', err);
          });

          // Use viewport dimensions for scaling instead of screen dimensions
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          
          this.cropArea = AreaCropper.getScaledCropArea(
            this.cropArea,
            viewportWidth,
            viewportHeight,
            videoWidth,
            videoHeight
          );
          

          // Validate crop area bounds
          this.cropArea.x = Math.max(0, Math.min(this.cropArea.x, videoWidth - 1));
          this.cropArea.y = Math.max(0, Math.min(this.cropArea.y, videoHeight - 1));
          this.cropArea.width = Math.max(1, Math.min(this.cropArea.width, videoWidth - this.cropArea.x));
          this.cropArea.height = Math.max(1, Math.min(this.cropArea.height, videoHeight - this.cropArea.y));

          // Update canvas size to actual crop dimensions for best quality
          this.canvas.width = this.cropArea.width;
          this.canvas.height = this.cropArea.height;
          
          // Set canvas rendering context for high quality
          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = 'high';
          

          // Start the cropping animation loop
          this.startCropping();
          
          // Get the stream from the canvas
          const stream = this.canvas.captureStream(this.fps);
          resolve(stream);
        } catch (error) {
          reject(error);
        }
      };

      this.video.onerror = () => {
        reject(new Error('Failed to load video stream'));
      };
    });
  }

  private startCropping(): void {
    const crop = (currentTime: number) => {
      // Throttle to target FPS
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        if (this.video.readyState >= 2) { // HAVE_CURRENT_DATA
          // Clear canvas with transparent background
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          
          
          // Validate crop area bounds before drawing
          const isValidCrop = 
            this.cropArea.x >= 0 && 
            this.cropArea.y >= 0 && 
            this.cropArea.x + this.cropArea.width <= this.video.videoWidth && 
            this.cropArea.y + this.cropArea.height <= this.video.videoHeight &&
            this.cropArea.width > 0 && 
            this.cropArea.height > 0;

          if (!isValidCrop) {
            console.error('AreaCropper - Invalid crop area bounds:', {
              cropArea: this.cropArea,
              videoSize: { width: this.video.videoWidth, height: this.video.videoHeight },
              validation: {
                xInBounds: this.cropArea.x >= 0,
                yInBounds: this.cropArea.y >= 0,
                widthInBounds: this.cropArea.x + this.cropArea.width <= this.video.videoWidth,
                heightInBounds: this.cropArea.y + this.cropArea.height <= this.video.videoHeight,
                positiveWidth: this.cropArea.width > 0,
                positiveHeight: this.cropArea.height > 0
              }
            });
            
            // Fill with debug color
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Invalid Bounds', 10, 30);
            return;
          }
          
          try {

            // Draw the cropped area from video to canvas at 1:1 ratio for best quality
            this.ctx.drawImage(
              this.video,
              this.cropArea.x, this.cropArea.y, // Source x, y
              this.cropArea.width, this.cropArea.height, // Source width, height
              0, 0, // Destination x, y
              this.cropArea.width, this.cropArea.height // Destination at actual crop size (1:1 ratio)
            );
            
            // Check if something was actually drawn
            const imageData = this.ctx.getImageData(0, 0, Math.min(10, this.canvas.width), Math.min(10, this.canvas.height));
            const hasContent = imageData.data.some((value, index) => index % 4 !== 3 && value !== 0); // Check RGB values
            
            
          } catch (error) {
            console.error('AreaCropper - Draw error:', error);
            console.log('AreaCropper - Draw parameters:', {
              cropArea: this.cropArea,
              canvasSize: { width: this.canvas.width, height: this.canvas.height },
              videoSize: { width: this.video.videoWidth, height: this.video.videoHeight }
            });
            // If drawing fails, fill with a debug color to identify the issue
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Crop Error', 10, 30);
          }
        } else {
          // Video not ready, fill with waiting indicator
          this.ctx.fillStyle = '#0000ff';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = '16px Arial';
          this.ctx.fillText('Loading...', 10, 30);
        }
        this.lastFrameTime = currentTime;
      }
      
      this.animationFrameId = requestAnimationFrame(crop);
    };
    
    this.animationFrameId = requestAnimationFrame(crop);
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clean up DOM elements
    if (this.video && this.video.parentNode) {
      this.video.srcObject = null;
      this.video.parentNode.removeChild(this.video);
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  updateCropArea(newCropArea: CropArea): void {
    this.cropArea = newCropArea;
    this.canvas.width = newCropArea.width;
    this.canvas.height = newCropArea.height;
  }

  // Get crop area scaled to actual video dimensions
  static getScaledCropArea(
    cropArea: CropArea, 
    viewportWidth: number, 
    viewportHeight: number, 
    videoWidth: number, 
    videoHeight: number
  ): CropArea {
    // Calculate scale factors from viewport to video dimensions
    const scaleX = videoWidth / viewportWidth;
    const scaleY = videoHeight / viewportHeight;


    const scaledArea = {
      x: Math.round(cropArea.x * scaleX),
      y: Math.round(cropArea.y * scaleY),
      width: Math.round(cropArea.width * scaleX),
      height: Math.round(cropArea.height * scaleY)
    };


    return scaledArea;
  }
}
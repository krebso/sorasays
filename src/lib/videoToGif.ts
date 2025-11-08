import GIF from 'gif.js';

export async function convertVideoToGif(
  videoUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log('=== Starting Video to GIF Conversion ===');
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = async () => {
      console.log('Video metadata loaded');
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('Video duration:', video.duration, 'seconds');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas dimensions to match video (scaled down for smaller GIF)
      const scale = 0.5; // Scale down to 50% for smaller file size
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
      
      // Initialize GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
        debug: true
      });
      
      gif.on('progress', (p) => {
        const progressPercent = Math.round(p * 100);
        console.log(`GIF encoding progress: ${progressPercent}%`);
        if (onProgress) {
          onProgress(progressPercent);
        }
      });
      
      gif.on('finished', (blob) => {
        console.log('=== GIF Encoding Complete ===');
        console.log('GIF size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        video.remove();
        canvas.remove();
        resolve(blob);
      });
      
      gif.on('error', (error) => {
        console.error('GIF encoding error:', error);
        video.remove();
        canvas.remove();
        reject(new Error('GIF encoding failed: ' + error));
      });
      
      // Extract frames from video
      const fps = 10; // Frames per second to extract
      const frameDelay = 1000 / fps; // Delay between frames in ms
      const skipFrames = 3; // Skip first 3 frames
      const totalFrames = Math.floor(video.duration * fps) - skipFrames;
      
      console.log(`Extracting ${totalFrames} frames at ${fps} FPS (skipping first ${skipFrames} frames)...`);
      
      let currentFrame = 0;
      const captureFrame = () => {
        if (currentFrame >= totalFrames) {
          console.log('All frames captured, encoding GIF...');
          gif.render();
          return;
        }
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add frame to GIF
        gif.addFrame(canvas, { copy: true, delay: frameDelay });
        
        currentFrame++;
        const frameTime = (currentFrame + skipFrames) / fps; // Skip first 3 frames
        video.currentTime = frameTime;
        
        // Progress update for frame extraction
        const extractProgress = Math.round((currentFrame / totalFrames) * 50); // 0-50%
        if (onProgress && currentFrame % 3 === 0) {
          onProgress(extractProgress);
        }
      };
      
      // Seek event will fire when video currentTime changes
      video.onseeked = () => {
        console.log(`Captured frame ${currentFrame}/${totalFrames}`);
        captureFrame();
      };
      
      // Start capturing frames (skip first 3 frames)
      video.currentTime = 3 / fps;
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    // Start loading video
    video.load();
  });
}

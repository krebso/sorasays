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
      
      console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
      console.log(`Video duration: ${video.duration}s`);
      
      // Initialize GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: 10, // 1-30, lower is better quality but larger file
        width: canvas.width,
        height: canvas.height,
      });
      
      gif.on('progress', (p) => {
        const progressPercent = Math.round(p * 100);
        console.log(`GIF encoding progress: ${progressPercent}%`);
        if (onProgress) {
          onProgress(progressPercent);
        }
      });
      
      gif.on('finished', (blob) => {
        console.log('GIF encoding complete!');
        console.log('GIF size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        video.remove();
        canvas.remove();
        resolve(blob);
      });
      
      // Extract frames from video
      const fps = 10; // Frames per second to extract
      const frameDelay = 1000 / fps; // Delay between frames in ms
      const totalFrames = Math.floor(video.duration * fps);
      
      console.log(`Extracting ${totalFrames} frames at ${fps} FPS...`);
      
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
        const frameTime = currentFrame / fps;
        video.currentTime = frameTime;
        
        // Progress update for frame extraction
        const extractProgress = Math.round((currentFrame / totalFrames) * 50); // 0-50%
        if (onProgress && currentFrame % 3 === 0) {
          onProgress(extractProgress);
        }
      };
      
      // Seek event will fire when video currentTime changes
      video.onseeked = captureFrame;
      
      // Start capturing frames
      video.currentTime = 0;
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    // Start loading video
    video.load();
  });
}

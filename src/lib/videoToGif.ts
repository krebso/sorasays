import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg) {
    console.log('FFmpeg already loaded, reusing instance');
    return ffmpeg;
  }

  console.log('Starting FFmpeg initialization...');
  const instance = new FFmpeg();
  
  instance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  if (onProgress) {
    instance.on('progress', ({ progress }) => {
      const progressPercent = Math.round(progress * 100);
      console.log(`FFmpeg progress: ${progressPercent}%`);
      onProgress(progressPercent);
    });
  }

  try {
    // Load FFmpeg from CDN
    console.log('Downloading FFmpeg core files from CDN (UMD build, classic worker)...');
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    console.log('Core JS downloaded');
    
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    console.log('WASM downloaded');
    
    // Try to load the worker from CDN, but fall back to an inline worker if unavailable
    let workerURL: string;
    try {
      workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
      console.log('Worker JS downloaded');
    } catch (err) {
      console.warn('Worker JS not found on CDN, creating inline worker via importScripts fallback.', err);
      const workerBlob = new Blob([`self.importScripts("${coreURL}");`], { type: 'text/javascript' });
      workerURL = URL.createObjectURL(workerBlob);
      console.log('Fallback worker created from coreURL');
    }
    console.log('Using workerURL:', workerURL);
    
    console.log('Loading FFmpeg...');
    const loadPromise = instance.load({
      coreURL,
      wasmURL,
      workerURL,
    });
    // Add a safety timeout so we don't hang forever if something goes wrong
    await Promise.race([
      loadPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('FFmpeg load timeout after 30s')), 30000)),
    ]);
    console.log('FFmpeg loaded successfully!');

    ffmpeg = instance;
    return instance;
  } catch (e) {
    console.error('FFmpeg load failed, resetting instance', e);
    ffmpeg = null;
    throw e;
  }
}

export async function convertVideoToGif(
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log('=== Starting GIF Conversion ===');
  console.log('Video blob size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
  
  const ffmpeg = await loadFFmpeg(onProgress);

  // Write video to FFmpeg virtual filesystem
  console.log('Writing video to FFmpeg virtual filesystem...');
  const startWrite = performance.now();
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob));
  console.log('Video written in', (performance.now() - startWrite).toFixed(0), 'ms');

  // Convert to GIF with optimized settings
  console.log('Starting FFmpeg conversion...');
  const startConvert = performance.now();
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '-loop', '0',
    'output.gif'
  ]);
  console.log('Conversion completed in', (performance.now() - startConvert).toFixed(0), 'ms');

  // Read the output GIF
  console.log('Reading output GIF...');
  const startRead = performance.now();
  const data = await ffmpeg.readFile('output.gif');
  console.log('GIF read in', (performance.now() - startRead).toFixed(0), 'ms');
  console.log('Output GIF size:', (data.length / 1024 / 1024).toFixed(2), 'MB');
  
  // Clean up
  console.log('Cleaning up temporary files...');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.gif');

  // Convert to proper Uint8Array for Blob
  const uint8Data = new Uint8Array(data as Uint8Array);
  console.log('=== GIF Conversion Complete ===');
  return new Blob([uint8Data], { type: 'image/gif' });
}

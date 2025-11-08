/**
 * Resize an image file to specific dimensions
 * @param file - The image file to resize
 * @param width - Target width
 * @param height - Target height
 * @returns Promise with resized image as base64 string
 */
export const resizeImage = (
  file: File,
  width: number,
  height: number
): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas with target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image scaled to fit canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const base64 = canvas.toDataURL(file.type);
        const base64Data = base64.split(',')[1];
        
        resolve({
          base64: base64Data,
          mimeType: file.type
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

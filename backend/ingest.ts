import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

const WEAVIATE_URL = process.env.WEAVIATE_URL || 'http://localhost:8080';
const IMAGES_FOLDER = process.env.IMAGES_FOLDER || './images';

// Initialize Weaviate client
function getClient(): WeaviateClient {
  const url = new URL(WEAVIATE_URL);
  return weaviate.client({
    scheme: url.protocol.replace(':', '') as 'http' | 'https',
    host: `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '8080')}`,
  });
}

const client = getClient();

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Delete the Image class if it exists (clears all data)
 */
async function deleteSchema(): Promise<void> {
  try {
    const schemaExists = await client.schema.exists('Image');
    if (schemaExists) {
      console.log('Deleting existing "Image" class and all its data...');
      await client.schema.classDeleter().withClassName('Image').do();
      console.log('Schema "Image" deleted successfully.');
    } else {
      console.log('Schema "Image" does not exist. Nothing to delete.');
    }
  } catch (error) {
    console.error('Error deleting schema:', error);
    throw error;
  }
}

/**
 * Create the Image schema in Weaviate
 */
async function createSchema(): Promise<void> {
  try {
    const schema = {
      class: 'Image',
      description: 'A class to store images with vector embeddings',
      vectorizer: 'multi2vec-clip',
      moduleConfig: {
        'multi2vec-clip': {
          imageFields: ['image'],
          // Removed textFields to ensure pure image-based similarity search
          // Filename is kept as metadata but doesn't affect vector embeddings
        },
      },
      properties: [
        {
          name: 'image',
          dataType: ['blob'],
          description: 'The image file as base64 encoded blob',
        },
        {
          name: 'filename',
          dataType: ['string'],
          description: 'The filename of the image',
        },
        {
          name: 'filepath',
          dataType: ['string'],
          description: 'The full file path of the image',
        },
      ],
    };

    await client.schema.classCreator().withClass(schema).do();
    console.log('Schema "Image" created successfully.');
  } catch (error) {
    console.error('Error creating schema:', error);
    throw error;
  }
}

/**
 * Convert image file to base64 string
 * Optimized for CLIP model: resize to 224x224 with proper aspect ratio preservation
 */
async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // CLIP models expect 224x224 images
    // Use 'cover' to ensure exact size, or 'contain' with padding for aspect ratio preservation
    // We'll use 'cover' to fill the entire 224x224 space, which is better for CLIP
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224, {
        fit: 'cover', // Fill the entire 224x224 space
        position: 'center', // Center the image when cropping
      })
      .jpeg({
        quality: 95, // Higher quality for better feature extraction
        mozjpeg: true // Use mozjpeg for better compression
      })
      .toBuffer();

    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error);
    throw error;
  }
}

/**
 * Get all image files from a directory
 */
function getImageFiles(dirPath: string): string[] {
  const imageFiles: string[] = [];

  if (!fs.existsSync(dirPath)) {
    console.warn(`Directory ${dirPath} does not exist.`);
    return imageFiles;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      imageFiles.push(...getImageFiles(filePath));
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        imageFiles.push(filePath);
      }
    }
  }

  return imageFiles;
}

/**
 * Ingest images from local folder into Weaviate
 */
async function ingestImages(): Promise<void> {
  try {
    console.log('Starting image ingestion...');
    console.log(`Looking for images in: ${IMAGES_FOLDER}`);

    // Clear existing schema and data, then create fresh schema
    await deleteSchema();
    await createSchema();

    // Get all image files
    const imageFiles = getImageFiles(IMAGES_FOLDER);

    if (imageFiles.length === 0) {
      console.warn('No image files found in the specified folder.');
      return;
    }

    console.log(`Found ${imageFiles.length} image(s) to ingest.`);

    // Batch size for Weaviate batch API (how many objects to send per batch request)
    const WEAVIATE_BATCH_SIZE = 50;
    // Parallel processing batch size (how many images to process concurrently)
    const PROCESSING_BATCH_SIZE = 20;
    let processed = 0;
    const startTime = Date.now();

    // Process images in parallel batches
    for (let i = 0; i < imageFiles.length; i += PROCESSING_BATCH_SIZE) {
      const processingBatch = imageFiles.slice(i, i + PROCESSING_BATCH_SIZE);

      // Process all images in this batch in parallel (image processing)
      const processedImages = await Promise.all(
        processingBatch.map(async (imagePath) => {
          try {
            const base64Image = await imageToBase64(imagePath);
            const filename = path.basename(imagePath);
            return {
              image: base64Image,
              filename: filename,
              filepath: imagePath,
            };
          } catch (error) {
            console.error(`Failed to process image ${imagePath}:`, error);
            return null;
          }
        })
      );

      // Filter out failed images
      const validImages = processedImages.filter(img => img !== null);

      // Send to Weaviate in batches using batch API
      for (let j = 0; j < validImages.length; j += WEAVIATE_BATCH_SIZE) {
        const weaviateBatch = validImages.slice(j, j + WEAVIATE_BATCH_SIZE);

        // Create batch inserter
        const batcher = client.batch.objectsBatcher();

        weaviateBatch.forEach((dataObject) => {
          batcher.withObject({
            class: 'Image',
            properties: dataObject,
          });
        });

        try {
          await batcher.do();
          processed += weaviateBatch.length;

          // Log progress every 50 images or at the end
          if (processed % 50 === 0 || processed === imageFiles.length) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1);
            console.log(`[${processed}/${imageFiles.length}] Processed (${rate} images/sec, ${elapsed}s elapsed)`);
          }
        } catch (error) {
          console.error(`Failed to ingest batch starting at index ${j}:`, error);
          // Fallback: try individual inserts for this batch
          for (const dataObject of weaviateBatch) {
            try {
              await client.data
                .creator()
                .withClassName('Image')
                .withProperties(dataObject)
                .do();
              processed++;
            } catch (individualError) {
              console.error(`Failed to ingest ${dataObject.filename}:`, individualError);
            }
          }
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1);
    console.log(`\nIngestion complete! Processed ${processed} out of ${imageFiles.length} images in ${totalTime}s (avg ${avgRate} images/sec)`);
  } catch (error) {
    console.error('Error during ingestion:', error);
    throw error;
  }
}

// Run ingestion if this script is executed directly
if (require.main === module) {
  ingestImages()
    .then(() => {
      console.log('Ingestion script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ingestion script failed:', error);
      process.exit(1);
    });
}

export { createSchema, ingestImages };


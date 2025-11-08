import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const WEAVIATE_URL = process.env.WEAVIATE_URL || 'http://localhost:8080';

// Initialize Weaviate client
function getClient(): WeaviateClient {
    const url = new URL(WEAVIATE_URL);
    return weaviate.client({
        scheme: url.protocol.replace(':', '') as 'http' | 'https',
        host: `${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '8080')}`,
    });
}

const client = getClient();

/**
 * Encode image file to base64 data URI
 */
function encodeImageToBase64(filepath: string): string {
    try {
        const imageBuffer = fs.readFileSync(filepath);
        const ext = path.extname(filepath).toLowerCase();

        let mimeType = 'image/jpeg'; // default
        if (ext === '.png') {
            mimeType = 'image/png';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            mimeType = 'image/jpeg';
        }

        const base64String = imageBuffer.toString('base64');
        return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
        console.error(`Error reading image file ${filepath}:`, error);
        throw error;
    }
}

/**
 * Search for images based on a text prompt
 */
async function searchImages(prompt: string, limit: number = 10): Promise<any[]> {
    try {
        const result = await client.graphql
            .get()
            .withClassName('Image')
            .withFields('filename filepath image _additional { id distance }')
            .withNearText({ concepts: [prompt] })
            .withLimit(limit)
            .do();

        if (result.data && result.data.Get && result.data.Get.Image) {
            return result.data.Get.Image;
        }

        return [];
    } catch (error) {
        console.error('Error searching images:', error);
        throw error;
    }
}

/**
 * Start Express API server
 */
function startApiServer() {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Trust proxy to get correct protocol and host from X-Forwarded-* headers
    app.set('trust proxy', true);

    // Enable CORS for all origins
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // JSON middleware
    app.use(express.json());

    // Serve static images from the images folder
    app.use('/images', express.static('images'));

    // GET /search endpoint
    app.get('/search', async (req: Request, res: Response) => {
        try {
            const prompt = req.query.prompt as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

            if (!prompt) {
                return res.status(400).json({ error: 'Please provide a search prompt as a query parameter: ?prompt=your+search+term' });
            }

            const results = await searchImages(prompt, limit);

            if (results.length === 0) {
                return res.json({
                    results: [],
                    count: 0
                });
            }

            // Get the base URL for image links
            // Use X-Forwarded-Proto if available (when behind proxy like Cloudflare), otherwise use req.protocol
            const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
            const host = req.get('host') || `localhost:${PORT}`;
            const baseUrl = `${protocol}://${host}`;

            // Encode images to base64 and generate HTTP URLs
            const resultsWithImages = await Promise.all(
                results.map(async (result) => {
                    const distance = result._additional?.distance || 'N/A';
                    const similarity = distance !== 'N/A' ? (1 - distance).toFixed(4) : 'N/A';

                    // Generate HTTP URL for the image
                    const imageUrl = `${baseUrl}/images/${result.filename}`;

                    let imageBase64 = '';
                    try {
                        imageBase64 = encodeImageToBase64(result.filepath);
                    } catch (error) {
                        console.error(`Failed to encode image ${result.filepath}:`, error);
                        // Continue without base64 if file read fails
                    }

                    return {
                        filename: result.filename,
                        filepath: result.filepath,
                        similarity: similarity,
                        distance: distance,
                        imageUrl: imageUrl,
                        imageBase64: imageBase64
                    };
                })
            );

            res.json({
                results: resultsWithImages,
                count: resultsWithImages.length
            });
        } catch (error) {
            console.error('Search API error:', error);
            res.status(500).json({ error: 'Internal server error during search' });
        }
    });

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
        console.error('Express error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
        console.log(`Image search API server running on http://localhost:${PORT}`);
        console.log(`Try: http://localhost:${PORT}/search?prompt=your+search+term`);
    });
}

/**
 * Main search function (CLI mode)
 */
async function main() {
    // Check if --api flag is provided
    if (process.argv.includes('--api')) {
        startApiServer();
        return;
    }

    // Get search prompt from command line arguments
    const prompt = process.argv[2];

    if (!prompt) {
        console.error('Please provide a search prompt as an argument.');
        console.log('Usage: npm run search "your search prompt here"');
        console.log('Or start API server: npm run api');
        process.exit(1);
    }

    try {
        console.log(`Searching for images matching: "${prompt}"\n`);

        const results = await searchImages(prompt, 10);

        if (results.length === 0) {
            console.log('No images found matching your prompt.');
            console.log('Make sure you have ingested images first using: npm run ingest');
            return;
        }

        console.log(`Found ${results.length} result(s):\n`);

        results.forEach((result, index) => {
            const distance = result._additional?.distance || 'N/A';
            const similarity = distance !== 'N/A' ? (1 - distance).toFixed(4) : 'N/A';

            console.log(`${index + 1}. ${result.filename}`);
            console.log(`   Path: ${result.filepath}`);
            console.log(`   Similarity: ${similarity}`);
            console.log(`   Distance: ${distance}`);
            console.log('');
        });
    } catch (error) {
        console.error('Search failed:', error);
        process.exit(1);
    }
}

// Run search if this script is executed directly
if (require.main === module) {
    main();
}

export { searchImages };


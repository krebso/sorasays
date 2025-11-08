import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';

dotenv.config();

const KAGGLE_DATASET = process.env.KAGGLE_DATASET || 'sayangoswami/reddit-memes-dataset';
const DOWNLOAD_FOLDER = process.env.DOWNLOAD_FOLDER || './kaggle-downloads';

/**
 * Download Kaggle dataset using Kaggle API
 * Requires KAGGLE_USERNAME and KAGGLE_KEY environment variables
 * Get your API credentials from: https://www.kaggle.com/settings
 */
async function downloadKaggleDataset(): Promise<string> {
    const username = process.env.KAGGLE_USERNAME;
    const key = process.env.KAGGLE_KEY;

    if (!username || !key) {
        throw new Error(
            'KAGGLE_USERNAME and KAGGLE_KEY environment variables are required.\n' +
            'Get your credentials from: https://www.kaggle.com/settings\n' +
            'Then add them to your .env file:\n' +
            'KAGGLE_USERNAME=your_username\n' +
            'KAGGLE_KEY=your_api_key'
        );
    }

    // Create download folder
    if (!fs.existsSync(DOWNLOAD_FOLDER)) {
        fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
    }

    const [owner, dataset] = KAGGLE_DATASET.split('/');
    const apiUrl = `https://www.kaggle.com/api/v1/datasets/download/${owner}/${dataset}`;

    console.log(`Downloading dataset: ${KAGGLE_DATASET}`);
    console.log(`Saving to: ${DOWNLOAD_FOLDER}`);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${username}:${key}`).toString('base64')}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Kaggle API error: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body received');
        }

        const zipPath = path.join(DOWNLOAD_FOLDER, `${dataset}.zip`);
        const fileStream = fs.createWriteStream(zipPath);

        // node-fetch v2 returns a Node.js Readable stream
        const body = response.body as NodeJS.ReadableStream;
        await pipeline(body, fileStream);

        console.log(`Downloaded to: ${zipPath}`);
        console.log(`\nExtract the zip file and point IMAGES_FOLDER to the extracted images directory.`);
        console.log(`Example: IMAGES_FOLDER=${DOWNLOAD_FOLDER}/${dataset} npm run ingest`);

        return zipPath;
    } catch (error) {
        console.error('Error downloading dataset:', error);
        throw error;
    }
}

// Run download if this script is executed directly
if (require.main === module) {
    downloadKaggleDataset()
        .then(() => {
            console.log('\nDownload complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nDownload failed:', error);
            process.exit(1);
        });
}

export { downloadKaggleDataset };


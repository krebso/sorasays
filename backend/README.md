# Weaviate Image Search RAG

A TypeScript-based image search system using Weaviate vector database. This project enables text-to-image search where you can describe what you're looking for in natural language, and the system will rank and return the most relevant images.

## Features

- **Text-to-Image Search**: Search images using natural language prompts
- **Vector-based Ranking**: Uses CLIP embeddings for semantic similarity
- **Batch Ingestion**: Efficiently ingest images from a local folder
- **Docker Setup**: Easy local development with Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Node.js (v18 or higher recommended)
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Weaviate with Docker Compose

```bash
docker-compose up -d
```

This will start:
- Weaviate database on `http://localhost:8080`
- Multi2Vec-CLIP inference service (running locally in Docker, no external API calls needed)
  - CLIP service is accessible internally at `http://multi2vec-clip:8080`
  - Exposed on port `9090` for testing/debugging (optional)

Wait a few moments for the services to fully start. You can verify:
- Weaviate is running: `curl http://localhost:8080/v1/meta`
- CLIP service is running: `curl http://localhost:9090/.well-known/ready` (optional check)

### 3. Prepare Your Images

You can use images from a local folder or download from Kaggle:

#### Option A: Local Images Folder

Create an `images` folder in the project root and add your images there:

```bash
mkdir images
# Copy your images to the images folder
```

#### Option B: Kaggle Dataset (e.g., Reddit Memes)

**Method 1: Manual Download (Recommended)**
1. Visit the [Kaggle dataset page](https://www.kaggle.com/datasets/sayangoswami/reddit-memes-dataset/data)
2. Download the dataset manually
3. Extract the zip file
4. Point `IMAGES_FOLDER` to the extracted images directory:

```bash
IMAGES_FOLDER=./path/to/extracted/images npm run ingest
```

**Method 2: Automatic Download via API**
1. Get your Kaggle API credentials from [Kaggle Settings](https://www.kaggle.com/settings)
2. Add to your `.env` file:
   ```env
   KAGGLE_USERNAME=your_username
   KAGGLE_KEY=your_api_key
   ```
3. Download the dataset:
   ```bash
   npm run download-kaggle
   ```
4. Extract the downloaded zip file and ingest:
   ```bash
   IMAGES_FOLDER=./kaggle-downloads/reddit-memes-dataset npm run ingest
   ```

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

### 4. Ingest Images

Run the ingestion script to load images into Weaviate:

```bash
npm run ingest
```

Or specify a custom images folder:

```bash
IMAGES_FOLDER=./path/to/images npm run ingest
```

The script will:
- Create the Image schema in Weaviate
- Scan the images folder (including subdirectories)
- Generate embeddings for each image
- Upload them to Weaviate with metadata

### 5. Search Images

Search for images using a text prompt:

```bash
npm run search "a sunset over mountains"
```

Or:

```bash
npm run search "a cat playing with a ball"
```

The search will return the top 10 most similar images ranked by semantic similarity.

## Project Structure

```
weaviate-rag/
├── docker-compose.yml    # Docker Compose configuration for Weaviate
├── ingest.ts             # Image ingestion script
├── index.ts              # Image search functionality
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── images/               # Your images folder (create this)
└── README.md             # This file
```

## Environment Variables

Create a `.env` file (optional) to customize settings:

```env
WEAVIATE_URL=http://localhost:8080
IMAGES_FOLDER=./images
```

## Usage Examples

### Ingest images from a specific folder:
```bash
IMAGES_FOLDER=./my-photos npm run ingest
```

### Search with different prompts:
```bash
npm run search "beautiful landscape"
npm run search "urban cityscape at night"
npm run search "cute animals"
```

## How It Works

**All processing happens locally in Docker - no external API calls required!**

1. **Ingestion**: 
   - Images are processed and converted to base64 format
   - The CLIP model (running in Docker) generates vector embeddings that capture semantic meaning
   - Images and their embeddings are stored in Weaviate with metadata (filename, filepath)

2. **Storage**: Images and their embeddings are stored in Weaviate with metadata (filename, filepath).

3. **Search**: When you provide a text prompt:
   - The prompt is converted to a vector embedding using the same CLIP model (running locally)
   - Weaviate performs a vector similarity search
   - Results are ranked by cosine similarity and returned

## Troubleshooting

### Weaviate not starting
- Make sure Docker is running
- Check if ports 8080, 50051, and 9090 are available
- View logs: `docker-compose logs`
- Check CLIP service logs: `docker-compose logs multi2vec-clip`
- Ensure both services start: `docker-compose ps`

### No images found during ingestion
- Verify the `images` folder exists and contains image files
- Check file extensions are supported (jpg, png, webp, gif)
- Use absolute paths if relative paths don't work

### Search returns no results
- Make sure you've run the ingestion script first
- Verify Weaviate is running: `curl http://localhost:8080/v1/meta`
- Check that images were successfully ingested

## Stopping the Services

To stop Weaviate:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```

## License

ISC


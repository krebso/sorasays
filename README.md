# Sora Says - AI-Powered GIF Generator

A modern web application that generates custom GIFs using Sora AI video generation technology. Users can describe what they want, select a tone, and receive a unique GIF created from AI-generated video content.

Available at: [https://sorasays.lovable.app](https://sorasays.lovable.app)

## 🚀 How to Use

### Quick Start
1. **Describe Your GIF**: Enter a text description of the GIF you want to create (e.g., "A cat dancing in the rain")
2. **Select Tone** (Optional): Choose from various tones like Funny, Dramatic, Cute, Sarcastic, etc., to influence the style
3. **Generate**: Click the generate button and wait for the AI to create your video
4. **Download**: Once converted to GIF format, download your creation

### Features
- **AI-Powered Generation**: Leverages Sora AI for high-quality video generation
- **Automatic GIF Conversion**: Videos are automatically converted to GIF format (skips first 3 frames for optimal quality)
- **Image Search Integration**: Browse and select reference images to guide generation
- **Tone Customization**: Multiple tone options to personalize the style
- **Instant Preview**: Watch the video preview while GIF conversion is in progress
- **One-Click Download**: Easy download of finished GIFs

## 🏗️ Key Architectural Decisions

### 1. **Client-Server Separation with Edge Functions**
- **Decision**: Use Supabase Edge Functions for all AI API calls rather than client-side requests
- **Rationale**: Keeps API keys secure, enables request validation, and provides better error handling and rate limiting
- **Impact**: Improved security, easier monitoring, and scalable architecture

### 2. **Browser-Based GIF Conversion**
- **Decision**: Use `gif.js` web worker for client-side video-to-GIF conversion
- **Rationale**: Offloads processing to the client, reduces server costs, and provides real-time progress feedback
- **Impact**: Better user experience with instant previews, no server bottleneck for conversions

### 3. **Frame Skipping Strategy**
- **Decision**: Skip the first 3 frames during GIF conversion
- **Rationale**: Early frames often contain artifacts or loading states that reduce quality
- **Impact**: Cleaner, more polished GIF output with better visual consistency

### 4. **Proxy-Based Image Search**
- **Decision**: Route image searches through a proxy edge function
- **Rationale**: Avoids CORS issues, enables caching, and abstracts the search API implementation
- **Impact**: More reliable image search functionality with flexibility to change providers

### 5. **Component-Based UI Architecture**
- **Decision**: Split functionality into focused components (GifGenerator, ImageSearch, ToneSelector)
- **Rationale**: Better maintainability, reusability, and testing capability
- **Impact**: Cleaner codebase with clear separation of concerns

### 6. **Design System Approach**
- **Decision**: Use CSS variables and Tailwind semantic tokens for theming
- **Rationale**: Enables consistent styling, easy theme switching, and better dark mode support
- **Impact**: Cohesive UI with flexible customization options

## 🛠️ Technologies Used

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework for building interactive components |
| **TypeScript** | Type safety and improved developer experience |
| **Vite** | Fast build tool and development server |
| **Tailwind CSS** | Utility-first CSS framework for responsive design |
| **Lucide React** | Icon library for consistent UI elements |
| **React Router** | Client-side routing and navigation |
| **Sonner** | Toast notifications for user feedback |
| **React Hook Form** | Form state management and validation |
| **Zod** | Schema validation for form inputs |

### Backend & Cloud
| Technology | Purpose |
|------------|---------|
| **Lovable Cloud** | Full-stack cloud platform (powered by Supabase) |
| **Supabase Edge Functions** | Serverless functions for API calls and business logic |
| **OpenAI API** | AI model integration for conversation analysis |

### Video & GIF Processing
| Technology | Purpose |
|------------|---------|
| **gif.js** | Browser-based GIF encoding with web workers |
| **Web Worker API** | Background processing for GIF conversion |
| **HTML5 Video API** | Video manipulation and frame extraction |

### UI Components
| Technology | Purpose |
|------------|---------|
| **Radix UI** | Accessible, unstyled component primitives |
| **shadcn/ui** | Pre-built component library built on Radix UI |
| **class-variance-authority** | Type-safe component variant management |
| **tailwind-merge** | Utility for merging Tailwind classes efficiently |

### Development Tools
| Technology | Purpose |
|------------|---------|
| **ESLint** | Code linting and style enforcement |
| **PostCSS** | CSS processing and transformation |
| **TypeScript Config** | Project-wide type checking configuration |

## 📦 Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Run development server
npm run dev
```

## 🔧 Environment Variables

The following environment variables are automatically configured by Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public API key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project identifier

Backend secrets (configured in Lovable Cloud):
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations

## 🚀 Deployment

This project is designed to work seamlessly with Lovable's built-in deployment:

1. Click the **Publish** button in the top right of the Lovable editor
2. Your frontend changes will be deployed automatically
3. Backend edge functions deploy automatically with code changes

For custom domain setup, visit Project → Settings → Domains in Lovable.

## 🏛️ Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── GifGenerator.tsx
│   │   ├── ImageSearch.tsx
│   │   └── ToneSelector.tsx
│   ├── pages/              # Page components
│   ├── lib/                # Utility functions
│   │   ├── videoToGif.ts   # GIF conversion logic
│   │   └── imageResize.ts  # Image processing
│   ├── hooks/              # Custom React hooks
│   └── integrations/       # API integrations
│       └── supabase/       # Supabase client
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── generate-sora-video/
│   │   ├── download-sora-video/
│   │   ├── analyze-conversation/
│   │   ├── proxy-image-fetch/
│   │   └── proxy-image-search/
│   └── config.toml         # Supabase configuration
└── public/                 # Static assets
    └── gif.worker.js       # GIF processing web worker
```

## 🤝 Contributing

### Edit via Lovable
Simply visit the [Lovable Project](https://lovable.dev/projects/51e6bb5d-11ea-4b48-9de0-6c670f9dea6f) and start prompting. Changes made via Lovable will be committed automatically to this repo.

### Edit via IDE
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

Requirements: Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Edit via GitHub
- Navigate to the desired file(s)
- Click the "Edit" button (pencil icon) at the top right
- Make your changes and commit

### Edit via GitHub Codespaces
- Click on the "Code" button (green button) near the top right
- Select the "Codespaces" tab
- Click on "New codespace" to launch a new Codespace environment

## 🐛 Troubleshooting

### GIF conversion fails
- Ensure the video URL is accessible and not blocked by CORS
- Check browser console for detailed error messages
- Verify that `gif.worker.js` is properly loaded

### API errors
- Verify that all required secrets are configured in Lovable Cloud
- Check edge function logs in the Lovable Cloud backend panel
- Ensure you haven't exceeded API rate limits

### Styling issues
- Verify that Tailwind CSS is properly configured
- Check that CSS variables are defined in `index.css`
- Ensure dark mode classes are correctly applied

For more help, visit the [Lovable documentation](https://docs.lovable.dev/).

## 📄 License

This project is private and proprietary.

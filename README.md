# DevForge AI IDE

A full-featured AI-powered development environment with Monaco Editor integration, intelligent code assistance, and multi-model AI support.

## Features

- **Monaco Editor Integration** - VS Code-like editing experience
- **AI Chat** - Multiple model support (Cloudflare Workers AI, Gemini)
- **Agent System** - Autonomous agents with tool execution capabilities
- **Project Intelligence** - Code indexing, dependency analysis, and semantic search
- **Device Lab** - Multi-device testing and preview
- **Auto-Fix** - Intelligent error detection and automated fixes
- **Build-with-Me** - AI-assisted build planning and execution
- **Terminal Integration** - Command analysis and safe execution
- **Live App Vision** - Visual diff and preview capabilities

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DEV-GTB/devforge-ide.git
cd devforge-ide
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_KEY` - Your Cloudflare API token with Workers AI permissions
- `GEMINI_API_KEY` - Your Google Gemini API key (optional)

4. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

### Project Structure

```
devforge-ide/
├── src/                 # Frontend React application
│   ├── components/      # Reusable UI components
│   ├── features/       # Feature modules (agent, testing, etc.)
│   ├── services/       # API and utility services
│   └── ui/            # Main UI components
├── server/             # Backend server (Express + TypeScript)
│   ├── agent/         # Agent system implementation
│   ├── ai/            # AI model integrations
│   ├── api/           # REST API endpoints
│   └── terminal/      # Terminal service
├── public/            # Static assets
└── package.json       # Dependencies and scripts
```

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_KEY`
   - `GEMINI_API_KEY` (optional)
4. Deploy

The project is configured for Vercel with automatic builds from the `master` branch.

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.

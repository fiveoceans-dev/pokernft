# ⚡ Vercel Deployment Guide

Complete guide to deploying the PokerNFT frontend to Vercel with optimal performance and configuration.

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:

- **Vercel Account**: [Sign up for free](https://vercel.com/signup)
- **Git Repository**: Code hosted on GitHub, GitLab, or Bitbucket
- **Node.js** (v18+): For local development and testing

### Quick Prerequisites Check

```bash
# Install Vercel CLI (optional but recommended)
npm i -g vercel

# Check version
vercel --version

# Login to Vercel
vercel login
```

## 🎯 Deployment Overview

The PokerNFT frontend is a **Next.js application** optimized for Vercel deployment:

- ✅ **Edge Runtime** - Global performance optimization
- ✅ **Automatic HTTPS** - SSL certificates included
- ✅ **CDN Distribution** - Static assets cached globally
- ✅ **Environment Variables** - Secure configuration management
- ✅ **Preview Deployments** - Test branches before production

## 🚀 Quick Deploy (Automated)

### Method 1: GitHub Integration (Recommended)

1. **Connect Repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"New Project"**
   - Import your GitHub repository
   - Select **"packages/nextjs"** as the root directory

2. **Configure Build Settings:**
   ```yaml
   Framework Preset: Next.js
   Root Directory: packages/nextjs
   Build Command: yarn build
   Output Directory: .next (leave empty for Next.js default)
   Install Command: yarn install
   Development Command: yarn dev
   ```

3. **Set Environment Variables:**
   - Add required variables (see configuration section)
   - Deploy automatically on push to main branch

### Method 2: Vercel CLI

```bash
# Navigate to Next.js directory
cd packages/nextjs

# Deploy to Vercel
vercel

# Follow prompts:
# - Set up new project? Y
# - Link to existing project? N
# - Project name: pokernft
# - Directory: ./
# - Want to modify settings? Y (to set root directory if needed)
```

## 📋 Manual Deployment (Step by Step)

### 1. Prepare Your Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare frontend for Vercel deployment"
git push origin main
```

### 2. Create Vercel Project

**Via Dashboard:**
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import from Git repository
4. Select your repository
5. Configure project settings

**Via CLI:**
```bash
cd packages/nextjs
vercel --prod
```

### 3. Configure Project Settings

**Root Directory:**
Set to `packages/nextjs` if deploying from monorepo

**Build Settings:**
```yaml
Framework Preset: Next.js
Build Command: yarn build
Output Directory: (leave empty - Next.js default)
Install Command: yarn install
Development Command: yarn dev
```

### 4. Set Environment Variables

**Required Variables:**
```bash
# WebSocket Server URL (your Heroku deployment)
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com

# Starknet Provider URL
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
NEXT_PUBLIC_SEPOLIA_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
```

**How to Set Variables:**
- **Dashboard**: Project Settings → Environment Variables
- **CLI**: `vercel env add VARIABLE_NAME`

### 5. Deploy and Verify

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Open deployed site
vercel --prod --open
```

## 🔧 Configuration Reference

### Environment Variables

Create these environment variables in your Vercel project:

#### WebSocket Configuration
```bash
# Production WebSocket server URL
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com

# Development fallback (for preview deployments)
NEXT_PUBLIC_WS_URL_DEV=ws://localhost:8080
```

#### Starknet Configuration
```bash
# Starknet network provider URLs
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
NEXT_PUBLIC_SEPOLIA_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
NEXT_PUBLIC_MAINNET_PROVIDER_URL=https://starknet-mainnet.blastapi.io/your-key/rpc/v0_8

# Network selection
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
```

#### Contract Addresses
```bash
# Deploy contracts first, then set these
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
```

#### Application Settings
```bash
# App branding
NEXT_PUBLIC_APP_NAME=PokerNFT
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Poker with NFTs on Starknet

# Game configuration
NEXT_PUBLIC_DEFAULT_BUY_IN=1000
NEXT_PUBLIC_MIN_BUY_IN=100
NEXT_PUBLIC_MAX_BUY_IN=10000

# Feature flags
NEXT_PUBLIC_DEV_MODE=false
NEXT_PUBLIC_DEBUG=false
```

#### Analytics (Optional)
```bash
# Google Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Other analytics services
NEXT_PUBLIC_MIXPANEL_TOKEN=your-token
```

### Setting Variables via CLI

```bash
# Add production variable
vercel env add NEXT_PUBLIC_WS_URL production

# Add preview variable (for branch deployments)
vercel env add NEXT_PUBLIC_WS_URL preview

# Add development variable
vercel env add NEXT_PUBLIC_WS_URL development

# List all variables
vercel env ls
```

### Setting Variables via Dashboard

1. Go to your project dashboard
2. Click **Settings**
3. Go to **Environment Variables**
4. Add variables for different environments:
   - **Production**: Main branch deployments
   - **Preview**: Branch deployments  
   - **Development**: Local development

## 📁 Project Structure for Vercel

Ensure your project structure is optimized for Vercel:

```
packages/nextjs/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── */                # Other pages
├── components/           # React components
├── hooks/               # Custom hooks
├── styles/              # CSS styles
├── public/              # Static assets
├── next.config.mjs      # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS config
├── package.json         # Dependencies
└── vercel.json          # Vercel configuration (optional)
```

### Current Vercel Configuration

The project already has a `vercel.json` configuration:

```json
{
  "framework": "nextjs",
  "installCommand": "yarn install",
  "buildCommand": "yarn build"
}
```

### Advanced Configuration (Optional)

You can extend the `vercel.json` for additional settings:

```json
{
  "framework": "nextjs",
  "installCommand": "yarn install",
  "buildCommand": "yarn build",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/game",
      "destination": "/play",
      "permanent": true
    }
  ]
}
```

## 🌍 Custom Domains

### Adding a Custom Domain

1. **Purchase Domain**: Use any domain registrar
2. **Add to Vercel**:
   ```bash
   # Via CLI
   vercel domains add your-domain.com
   
   # Via Dashboard: Project Settings → Domains
   ```
3. **Configure DNS**: Point your domain to Vercel
4. **SSL Certificate**: Automatically provisioned

### DNS Configuration

**For Apex Domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.19.61
```

**For Subdomain (www.yourdomain.com):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 📊 Performance Optimization

### Next.js Optimizations

**Image Optimization:**
```jsx
import Image from 'next/image'

// Optimized images
<Image
  src="/poker-card.png"
  alt="Poker Card"
  width={100}
  height={140}
  priority // For above-the-fold images
/>
```

**Dynamic Imports:**
```jsx
// Lazy load heavy components
const GameEngine = dynamic(() => import('../components/GameEngine'), {
  loading: () => <p>Loading game...</p>,
  ssr: false
})
```

**Font Optimization:**
```jsx
// In app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
```

### Bundle Analysis

```bash
# Navigate to Next.js directory
cd packages/nextjs

# Add to package.json scripts (if not present)
"analyze": "ANALYZE=true yarn build"

# Run analysis
yarn analyze
```

### Performance Monitoring

**Core Web Vitals:**
- Vercel automatically tracks performance metrics
- View in Analytics dashboard
- Set up alerts for performance regressions

## 🔄 Deployment Workflow

### Automatic Deployments

**Production Deployment:**
- Triggered on push to `main` branch
- Uses production environment variables
- Available at your custom domain

**Preview Deployments:**
- Triggered on push to any branch
- Uses preview environment variables
- Unique URL for each deployment

**Development:**
- Local development with `yarn dev`
- Uses development environment variables

### Branch-Based Deployments

```bash
# Create feature branch
git checkout -b feature/new-table-ui

# Make changes and push
git push origin feature/new-table-ui

# Vercel automatically creates preview deployment
# URL: pokernft-frontend-git-feature-new-table-ui.vercel.app
```

### Manual Deployments

```bash
# Deploy current directory
vercel

# Deploy specific branch
vercel --prod

# Deploy with environment override
vercel --env NEXT_PUBLIC_WS_URL=wss://staging-server.herokuapp.com
```

## 🔍 Monitoring & Analytics

### Built-in Analytics

Vercel provides analytics for:
- **Page Views**: Traffic and user behavior
- **Performance**: Core Web Vitals metrics
- **Functions**: API route performance

**Enable Analytics:**
1. Go to project dashboard
2. Click **Analytics** tab
3. Enable Web Analytics

### Custom Analytics

**Google Analytics:**
```jsx
// In app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID} />
      </body>
    </html>
  )
}
```

### Error Monitoring

**Sentry Integration:**
```bash
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig({
  // Your Next.js config
})
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**

```bash
# Issue: Build command fails
# Check: Build logs in Vercel dashboard

# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

**Environment Variable Issues:**

```bash
# Issue: Environment variables not available
# Check: Variable names start with NEXT_PUBLIC_ for client-side
# Check: Variables are set for correct environment (production/preview)

# Debug: Add logging
console.log('WS URL:', process.env.NEXT_PUBLIC_WS_URL)
```

**WebSocket Connection Failures:**

```bash
# Issue: Can't connect to WebSocket server
# Check: WebSocket URL uses wss:// (not ws://) in production
# Check: Server is deployed and accessible
# Check: CORS settings on server allow frontend domain
```

**Starknet Connection Issues:**

```bash
# Issue: Starknet provider not connecting
# Check: Provider URL is correct and accessible
# Check: Network configuration matches provider
# Check: Browser console for specific errors
```

### Debug Tools

**Vercel CLI Debugging:**
```bash
# View deployment logs
vercel logs

# Check deployment functions
vercel inspect

# Local debugging with production environment
vercel dev
```

**Browser Debugging:**
```javascript
// Add to components for debugging
console.log('Environment:', {
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
  network: process.env.NEXT_PUBLIC_STARKNET_NETWORK,
  providerUrl: process.env.NEXT_PUBLIC_PROVIDER_URL
})
```

## 📈 Production Best Practices

### Security

**Environment Variables:**
- Never commit `.env.local` to Git
- Use different values for dev/staging/production
- Rotate API keys regularly

**HTTPS Only:**
```jsx
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production' && !window.location.protocol.includes('https')) {
  window.location.replace(window.location.href.replace('http:', 'https:'))
}
```

### Performance

**Image Optimization:**
- Use Next.js Image component
- Provide width/height attributes
- Use appropriate image formats (WebP, AVIF)

**Code Splitting:**
- Dynamic imports for heavy components
- Route-based code splitting (automatic with App Router)
- Bundle analysis to identify large dependencies

**Caching:**
- Static assets cached automatically by Vercel CDN
- Configure cache headers for API routes
- Use SWR or React Query for data fetching

### SEO

**Metadata:**
```jsx
// In app/layout.tsx or page.tsx
export const metadata = {
  title: 'PokerNFT - Decentralized Poker',
  description: 'Play poker with NFTs on Starknet',
  keywords: 'poker, nft, starknet, blockchain, gaming',
  openGraph: {
    title: 'PokerNFT',
    description: 'Decentralized Poker with NFTs',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PokerNFT',
    description: 'Decentralized Poker with NFTs',
    images: ['/twitter-card.png'],
  }
}
```

**Sitemap:**
```jsx
// Create app/sitemap.js
export default function sitemap() {
  return [
    {
      url: 'https://pokernft.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://pokernft.com/play',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]
}
```

## 🆘 Support

### Getting Help

1. **Check Vercel Docs:**
   - [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
   - [Environment Variables](https://vercel.com/docs/projects/environment-variables)

2. **Debug Tools:**
   - Vercel Dashboard logs
   - Browser developer tools
   - Next.js built-in debugging

3. **Community Support:**
   - [Vercel Discord](https://vercel.com/discord)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/vercel)

4. **Common Solutions:**
   - Clear build cache: Redeploy project
   - Check environment variables: Project Settings
   - Review build logs: Deployment details

---

🎉 **Deployment Complete!** Your frontend is now live on Vercel with global CDN distribution.
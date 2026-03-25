# Lettly — AI-powered landlord portfolio management
### lettly.co

The only property management platform built for the Renters' Rights Bill era.

## Deploy in 30 minutes

### Step 1: Anthropic API key
1. Go to console.anthropic.com → Sign up
2. API Keys → Create Key → copy it (starts sk-ant-...)

### Step 2: GitHub account
1. github.com → Sign up → verify email

### Step 3: Upload the code
1. GitHub: + → New repository → name it `lettly` → Private → Create
2. Click "uploading an existing file"
3. Drag everything from the lettly folder into the browser
4. Commit changes

### Step 4: Deploy on Vercel
1. vercel.com → Sign up with GitHub
2. Add New Project → find lettly → Import
3. Environment Variables: ANTHROPIC_API_KEY = your key
4. Deploy — live in ~2 mins

### Step 5: Connect lettly.co
1. Vercel → your project → Settings → Domains → add lettly.co
2. Vercel shows two DNS records — copy both
3. Namecheap → lettly.co → Manage → Advanced DNS → add both records
4. Save — live at lettly.co within 30 minutes

## Stack
- Next.js 14 + React
- Vercel (free hosting)
- Anthropic Claude API (~£0.01 per conversation)
- lettly.co domain

## Costs
- Vercel: Free
- API: ~£0.01/conversation
- Domain: ~£25/year (already registered)

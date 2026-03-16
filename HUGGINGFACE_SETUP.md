# HuggingFace Image Generation Setup

## ✅ Changes Implemented

### 1. **HuggingFace Integration**
- Replaced Gemini with HuggingFace Stable Diffusion XL for image generation
- Free tier: ~1000 requests/day (perfect for college demo)
- Model: `stabilityai/stable-diffusion-xl-base-1.0`

### 2. **Testing Flag**
- Set `SKIP_IMAGE_GENERATION=true` to use placeholder images during testing
- Saves your API quota while developing/testing
- Uses beautiful Unsplash dog images as placeholders

### 3. **Chapter Range**
- Users can now choose **3-10 chapters** (previously 2-8)
- Updated in frontend slider

### 4. **Longer Chapters**
- Each chapter now generates **200-300 words** (previously ~50-100)
- More engaging, detailed stories with dialogue and descriptions

### 5. **Server Overload Prevention**
- **2-second delay** between image generation requests
- **Automatic retries** with exponential backoff for rate limits
- **Sequential processing** (not parallel) to avoid overwhelming HuggingFace API

---

## 🚀 Setup Instructions

### Step 1: Get HuggingFace API Key
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create account (free, no credit card needed)
3. Click "New token" → "Read" access is enough
4. Copy your token (starts with `hf_...`)

### Step 2: Add to Supabase Secrets
```bash
# From your project root
cd "D:\react apps\kk"

# Add HuggingFace API key
supabase secrets set HUGGINGFACE_API_KEY=hf_your_actual_token_here
```

### Step 3: Enable Testing Mode (Optional)
```bash
# For testing WITHOUT generating images (uses placeholders)
supabase secrets set SKIP_IMAGE_GENERATION=true

# For production (actual image generation)
supabase secrets set SKIP_IMAGE_GENERATION=false
```

### Step 4: Deploy Updated Function
```bash
supabase functions deploy generate-story
```

### Step 5: Test Frontend
```bash
cd frontend
npm run dev
```

---

## 🎯 For College Demo

### Recommended Settings:
- **During development/testing**: `SKIP_IMAGE_GENERATION=true`
- **For live demo**: `SKIP_IMAGE_GENERATION=false`
- **Before demo day**: Test 2-3 stories to ensure quota is available

### Expected Performance:
- **3 chapter story**: ~6-10 seconds (text) + ~15-20 seconds (images) = **~25-30 seconds total**
- **10 chapter story**: ~10-15 seconds (text) + ~50-60 seconds (images) = **~70 seconds total**

### Quota Management:
- **1000 images/day** = enough for ~100 stories with 10 chapters each
- If you hit rate limits during demo, images will retry automatically with delays

---

## 🔧 Troubleshooting

### "Missing HUGGINGFACE_API_KEY" error
- Make sure you ran: `supabase secrets set HUGGINGFACE_API_KEY=hf_...`
- Check with: `supabase secrets list`

### Images not showing
- Check browser console for errors
- Verify Supabase Storage bucket `story-images` exists
- Check if `SKIP_IMAGE_GENERATION=true` (will show placeholders)

### Rate limit errors (503/429)
- Function auto-retries with delays (up to 3 attempts)
- If persistent, wait a few minutes and try again
- Consider enabling `SKIP_IMAGE_GENERATION=true` temporarily

### Images look wrong
- HuggingFace model quality varies based on server load
- Free tier may use lower priority queues
- Prompts are optimized for Pixar-style, child-friendly content

---

## 📊 Comparison: Gemini vs HuggingFace

| Feature | Gemini | HuggingFace |
|---------|--------|-------------|
| Free tier | ~1500/day | ~1000/day |
| Cost | May require billing | Truly free |
| Quality | Very high | High |
| Speed | Fast | Medium (free tier) |
| Reliability | Quota changes | Stable for demos |
| Setup | Google account needed | Simple token |

---

## 🎨 Image Features

- **Pixar-style** illustrations
- **Child-friendly** content
- **Vivid colors** and magical atmosphere
- **Consistent** across chapters (attempted via prompts)
- **Auto-uploaded** to Supabase Storage
- **Signed URLs** (24-hour expiry)

---

## 🔐 Security Notes

- API keys stored as Supabase secrets (not in code)
- All image generation happens server-side (Edge Function)
- Users never see your HuggingFace token
- Images stored per-user in isolated folders

---

## Next Steps

1. ✅ Get HuggingFace token
2. ✅ Set secrets in Supabase
3. ✅ Deploy function
4. ✅ Test with `SKIP_IMAGE_GENERATION=true` first
5. ✅ Test real generation with `SKIP_IMAGE_GENERATION=false`
6. ✅ Show your demo to college! 🎓

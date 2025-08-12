# Recurring Payments System - Quick Start

## 🚀 Setup (3 Simple Steps)

### 1. Add Environment Variable
```bash
# Add to .env.local
CRON_SECRET_KEY=your-super-secret-key-here
```
💡 Generate a secure key: `openssl rand -base64 32`

### 2. Deploy to Vercel
The `vercel.json` file is already configured for daily cron jobs at 9 AM UTC.

### 3. Test the System
- Go to **Payments → Payment Plans** tab
- Click **"Check Status"** button
- Should show: `Templates ready for processing: X`

## ✅ That's it! 

The system will now automatically:
- Check daily at 9 AM UTC for due recurring payments
- Generate invoices for all active students
- Update template schedules for next cycle
- Handle individual student amount overrides
- Skip paused students/templates

## 🎛️ Management Features

- **Pause/Resume**: Individual templates or students
- **Amount Overrides**: Custom amounts per student  
- **Status Dashboard**: See what's due for processing
- **Automatic Scheduling**: Monthly/weekly payment cycles

## 📊 Monitoring

Check your Vercel dashboard → Functions → Cron Jobs for:
- Execution logs
- Success/failure status
- Performance metrics

## 🔧 Advanced Configuration

See `docs/recurring-payments-setup.md` for:
- Alternative scheduling options
- API endpoint documentation  
- Troubleshooting guide
- Security considerations

---

**Need Help?** Check the full documentation in `/docs/recurring-payments-setup.md`
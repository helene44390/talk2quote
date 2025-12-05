# Talk2Quote - Setup and Configuration Guide

This guide covers the setup required for the newly implemented features.

## Features Implemented

### ✅ Fixed Issues
1. **Backend Quote Generation** - Fixed parameter mismatch and added proper AI prompting
2. **PDF Generation** - Added jsPDF library for client-side PDF generation
3. **Email with PDF Attachments** - Implemented Firebase function to send quotes via email
4. **Referral Code Copy** - Fixed copy-to-clipboard functionality
5. **Company Details Persistence** - Save/load company details from Firestore
6. **Settings Persistence** - Save/load user preferences (tax rate, notifications)

---

## Required Firebase Configuration

### 1. Gemini API Key (Required for Quote Generation)

The AI quote generation feature requires a Google Gemini API key.

**Setup:**
```bash
# Option 1: Using Firebase config (recommended for production)
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"

# Option 2: Using environment variables (for local testing)
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

**Get your API key:**
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key or use an existing one
3. Copy the key and set it using one of the methods above

---

### 2. Email Configuration (Required for Email Sending)

The email functionality uses Gmail SMTP. You'll need a Gmail account with an App Password.

**Setup:**
```bash
# Set email configuration
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"

# Optional: Set app URL for approval links
firebase functions:config:set app.url="https://talk2quote-app.web.app"
```

**Get Gmail App Password:**
1. Go to your Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. App passwords → Generate new app password
4. Select "Mail" and "Other (Custom name)"
5. Copy the 16-character password
6. Use this as `email.password`

**Important Notes:**
- Never use your actual Gmail password
- App passwords only work if 2-Step Verification is enabled
- For production, consider using SendGrid, AWS SES, or Mailgun instead

---

### 3. Deploy Firebase Functions

After configuring the above, deploy your functions:

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:generateQuote,functions:sendQuoteEmail
```

---

## Testing the Features

### Test Quote Generation
1. Log in to the app
2. Enter a client email
3. Tap the microphone and speak: "I need a quote for painting a 3-bedroom house. Labor is 2000 dollars, materials are 500 dollars"
4. The AI should generate a structured quote with line items

### Test Email Sending
1. Create a quote
2. Go to the "Share" screen
3. Click "Email with PDF"
4. Check that the client receives an email with:
   - Professional HTML email template
   - PDF attachment with full quote details
   - Approval link (optional)

### Test PDF Download
1. Create a quote
2. Go to "Preview PDF"
3. Click "Download PDF"
4. Verify the PDF contains all quote details with proper formatting

### Test Company Details
1. Go to "Company Details"
2. Fill in your business information
3. Click "Save Details"
4. Refresh the page and verify settings persist

### Test Settings
1. Go to "Settings"
2. Change tax rate or toggle notifications
3. Settings should save automatically
4. Refresh and verify persistence

---

## Firestore Database Structure

The app uses the following Firestore collections:

```
users/{userId}/
  ├── profile/details              # User profile and subscription
  ├── settings/
  │   ├── company                  # Company details
  │   └── preferences              # User preferences
  ├── quotes/{quoteId}             # All user quotes
  └── integrations/active          # Accounting software integrations
```

**No additional Firestore setup required** - collections are created automatically.

---

## Environment Variables

Ensure your `.env` file has the Firebase configuration (already present):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Note: The VITE_SUPABASE_* variables are used for Stripe integration. If you're not using Stripe, these can be ignored.

---

## Known Limitations

1. **Email Sending Quota**: Gmail SMTP has a daily sending limit (500 emails/day for free accounts)
2. **PDF Generation**: Large quotes with many line items may take a few seconds to generate
3. **Accounting Integrations**: OAuth flows not yet implemented (Xero, QuickBooks, MYOB)
4. **Client Approval Flow**: Approval links are generated but landing page not yet implemented

---

## Deployment

When you push to GitHub, the workflow will:
1. Build the frontend (including new PDF features)
2. Deploy to Firebase Hosting

To deploy functions separately:
```bash
npm run deploy:functions
```

Or deploy everything:
```bash
firebase deploy
```

---

## Troubleshooting

### Quote Generation Not Working
- Check Firebase Functions logs: `firebase functions:log`
- Verify Gemini API key is set: `firebase functions:config:get`
- Ensure you have billing enabled on your Firebase project

### Email Not Sending
- Check Functions logs for detailed error messages
- Verify email credentials are correct
- Test Gmail App Password login manually
- Check that 2-Step Verification is enabled on Gmail account

### PDF Generation Errors
- Check browser console for errors
- Ensure jsPDF is installed: `npm list jspdf`
- Try regenerating the quote

### Settings Not Persisting
- Check Firestore rules allow authenticated users to write to their settings
- Check browser console for Firestore permission errors
- Verify user is logged in

---

## Next Steps (Optional Improvements)

1. Implement accounting software OAuth flows
2. Create client approval landing page
3. Add quote search/filter in history
4. Implement quote status tracking
5. Add email templates customization
6. Switch to professional email service (SendGrid/AWS SES)

---

## Support

For issues or questions:
1. Check Firebase Functions logs: `firebase functions:log`
2. Check browser console for frontend errors
3. Review Firestore security rules
4. Verify all configuration steps above

---

**Last Updated:** December 2024

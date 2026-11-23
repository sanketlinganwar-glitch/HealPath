# HACKBYTE — STAGE 9: META WHATSAPP CLOUD API SETUP GUIDE
**Target Release:** `v2.6.0-analytics`  
**Partner Hospital:** Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra  

---

## 1. Prerequisites & Meta Developer Portal Configuration

To connect HealPath to live WhatsApp messaging via the official Meta WhatsApp Cloud API:

1. **Create Meta App:**
   - Go to [developers.facebook.com](https://developers.facebook.com).
   - Create an app of type **Business**.
   - Add the **WhatsApp** product to your app.

2. **Obtain API Credentials:**
   - **Phone Number ID:** Found under WhatsApp > API Setup (e.g. `105938472918234`).
   - **WhatsApp Business Account ID:** Found under WhatsApp > API Setup (e.g. `100492837482910`).
   - **System User Permanent Access Token:** Generated in Meta Business Suite > Users > System Users with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - **App Secret:** Found under App Settings > Basic > App Secret.

3. **Configure Webhook Handshake:**
   - In Meta App Dashboard, navigate to **WhatsApp > Configuration > Webhook**.
   - Set **Callback URL**: `https://<YOUR_DOMAIN>/api/webhook/whatsapp` (e.g. via ngrok for local testing: `https://abcd-123.ngrok.app/api/webhook/whatsapp`).
   - Set **Verify Token**: `healpath_wa_verify_secret_2026` (or the custom value configured in your `.env`).
   - Click **Verify and Save**. Meta will dispatch a GET request with `hub.challenge`.
   - Subscribe to webhook fields: `messages` (to receive inbound opt-out requests and delivery receipts).

---

## 2. Environment Variables Configuration

Copy `.env.example` placeholders into `backend/.env`:

```env
# Meta WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_system_user_token...
WHATSAPP_PHONE_NUMBER_ID=105938472918234
WHATSAPP_BUSINESS_ACCOUNT_ID=100492837482910
WHATSAPP_APP_SECRET=a1b2c3d4e5f6...your_meta_app_secret...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=healpath_wa_verify_secret_2026
WHATSAPP_GRAPH_API_VERSION=v19.0
```

> **Note on Simulation Mode:** If `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` is left empty, the application automatically runs in **Intelligent Simulation Mode**. Notifications are logged with `status="simulated"`, visible on the Admin Dashboard with full retry and audit tracking.

---

## 3. Trilingual Template Specification

Stage 9 supports English (`en`), Hindi (`hi`), and Marathi (`mr`).

### 3.1 Token Generated
- **English:** `🏥 Sanjeevan Hospital, Yavatmal: Hello {name}, your OPD Token {token_number} is registered in {dept}. Estimated wait time: ~{wait} mins. Track live queue at: {url}`
- **Hindi:** `🏥 संजीवन हॉस्पिटल, यवतमाळ: नमस्ते {name}, आपका ओपीडी टोकन {token_number} विभाग {dept} में पंजीकृत हो गया है। अनुमानित प्रतीक्षा समय: ~{wait} मिनट। कतार की स्थिति लाइव देखें: {url}`
- **Marathi:** `🏥 संजीवन मल्टिस्पेशालिटी रुग्णालय, यवतमाळ: नमस्कार {name}, आपले ओपीडी टोकन {token_number} विभाग {dept} मध्ये नोंदवले गेले आहे। अंदाजे प्रतीक्षा वेळ: ~{wait} मिनिटे। थेट रांग स्थिती पहा: {url}`

### 3.2 Doctor Calling (Now Serving)
- **English:** `📢 Sanjeevan Hospital: Token {token_number}! {name}, your turn is now! Please proceed to Dr. {doctor_name} in {room}.`
- **Hindi:** `📢 संजीवन हॉस्पिटल: टोकन {token_number}! {name}, अब आपकी बारी है। कृपया कक्ष {room} में डॉ. {doctor_name} के पास जाएं।`
- **Marathi:** `📢 संजीवन रुग्णालय: टोकन {token_number}! {name}, आता आपली पाळी आहे। कृपया रूम {room} मध्ये डॉ. {doctor_name} यांच्या कक्षात जावे।`

---

## 4. Verification & Testing

Verify that your webhook and delivery flows are functioning:
```bash
# Test Webhook GET verification
curl -X GET "http://localhost:8000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=healpath_wa_verify_secret_2026&hub.challenge=12345"
# Response should be 12345 with HTTP 200

# View Notification Status & Logs
curl -X GET "http://localhost:8000/api/notifications/status"
```

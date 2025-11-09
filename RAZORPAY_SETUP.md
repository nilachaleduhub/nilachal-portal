# Razorpay Payment Integration Setup

## Prerequisites
1. Razorpay account (sign up at https://razorpay.com)
2. Test/Live API keys from Razorpay Dashboard

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following:

```env
# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/kp_web2

# Server Port
PORT=3000

# Razorpay API Keys
# Get these from: https://dashboard.razorpay.com/app/keys
# For testing, use Test Mode keys
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### 3. Get Razorpay Keys

1. Go to https://dashboard.razorpay.com
2. Login to your account
3. Navigate to **Settings** > **API Keys**
4. For testing, use **Test Mode** keys
5. Copy the **Key ID** and **Key Secret**
6. Paste them in your `.env` file

### 4. Test Mode vs Live Mode

- **Test Mode**: Use test keys for local development. Test payments won't charge real money.
- **Live Mode**: Use live keys for production. Real payments will be processed.

### 5. Test Payment Flow

1. Start the server:
   ```bash
   npm start
   ```

2. Login to your website
3. Navigate to a course/test detail page
4. Click "Buy Now"
5. Use Razorpay test cards:
   - **Card Number**: 4111 1111 1111 1111
   - **CVV**: Any 3 digits (e.g., 123)
   - **Expiry**: Any future date (e.g., 12/25)
   - **Name**: Any name

### 6. Payment Flow

1. User clicks "Buy Now" on course/test detail page
2. System creates Razorpay order via `/api/payment/create-order`
3. Razorpay checkout modal opens
4. User completes payment
5. Payment is verified via `/api/payment/verify`
6. Purchase is saved to database
7. User is redirected to dashboard

### 7. API Endpoints

- `GET /api/payment/key` - Get Razorpay public key
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment signature
- `GET /api/purchases?userId=xxx` - Get user purchases

### 8. Troubleshooting

**Issue**: "Razorpay not configured"
- **Solution**: Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `.env`

**Issue**: Payment verification fails
- **Solution**: Ensure you're using the correct secret key matching the key ID

**Issue**: Order creation fails
- **Solution**: Check Razorpay dashboard for API key permissions and account status

### 9. Production Checklist

- [ ] Switch to Live Mode keys
- [ ] Update webhook URLs in Razorpay dashboard
- [ ] Enable payment notifications
- [ ] Test with real payment (small amount)
- [ ] Set up proper error logging
- [ ] Configure SSL certificate for production

## Notes

- All payments are stored in the `Purchase` collection in MongoDB
- Purchases are linked to users via `userId`
- Payment verification uses HMAC SHA256 signature verification
- Test mode allows testing without real money transactions





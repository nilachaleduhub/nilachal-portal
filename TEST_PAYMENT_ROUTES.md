# Testing Payment Routes

## Issue
Error: "API route not found: POST /payment/create-order"

## Solution Steps

1. **Restart the server** - The routes were just added, so the server needs to be restarted:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm start
   ```

2. **Verify the routes are registered** - Check the server console when it starts. You should see:
   - "MongoDB connected"
   - "Razorpay initialized" (if keys are set) or "Razorpay keys not found" (if not set)
   - "Server listening on port 3000"

3. **Test the route directly** - You can test if the route is accessible:
   ```bash
   # Using curl (if available):
   curl -X POST http://localhost:3000/api/payment/create-order \
     -H "Content-Type: application/json" \
     -d '{"amount":100,"userId":"test","purchaseType":"course","purchaseId":"test123"}'
   ```

4. **Check browser console** - Open browser DevTools (F12) and check:
   - Network tab: See the actual request URL being sent
   - Console tab: See any JavaScript errors

5. **Verify environment variables** - Make sure `.env` file exists with:
   ```
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

## Common Issues

- **Server not restarted**: Routes won't be available until server is restarted
- **Missing .env file**: Razorpay won't initialize without keys
- **Port conflict**: Make sure port 3000 is available
- **MongoDB not running**: Server might fail to start

## Debug Steps

1. Check server logs when clicking "Buy Now"
2. Look for console.log messages: "POST /api/payment/create-order called"
3. If you don't see that message, the route isn't being hit
4. Check the Network tab in browser DevTools to see the actual request URL





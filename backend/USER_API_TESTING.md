# User Registration API - Testing Guide

## Prerequisites
- Backend server running on http://localhost:3001
- MongoDB connection established

## API Endpoints

### 1. Register New User

```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "tenant"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "tenant",
    "emailVerified": false,
    "createdAt": "2026-02-15T10:30:00.000Z"
  }
}
```

### 2. Get User by Address

```bash
curl http://localhost:3001/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### 3. Update User Profile

```bash
curl -X PUT http://localhost:3001/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "name": "John Updated Doe"
  }'
```

### 4. Get User by Email

```bash
curl http://localhost:3001/api/users/email/john.doe@example.com
```

### 5. Delete User

```bash
curl -X DELETE http://localhost:3001/api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Test Multiple Users

```bash
# Register Tenant 1
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "email": "tenant1@example.com",
    "name": "Alice Tenant"
  }'

# Register Tenant 2
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "email": "tenant2@example.com",
    "name": "Bob Tenant"
  }'

# Register Landlord
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x0987654321098765432109876543210987654321",
    "email": "landlord@example.com",
    "name": "Charlie Landlord",
    "role": "landlord"
  }'
```

## Test Email Notification Flow

### Step 1: Register a tenant with email
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "email": "your-real-email@gmail.com",
    "name": "Test Tenant"
  }'
```

### Step 2: Test notification endpoint (simulates CRE workflow)
```bash
curl -X POST http://localhost:3001/api/notifications/lease-activated \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-backend-api-key" \
  -d '{
    "eventType": "lease-activated",
    "leaseId": "123",
    "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "landlordAddress": "0x0987654321098765432109876543210987654321",
    "propertyId": "456",
    "startDate": 1709251200,
    "endDate": 1740787200,
    "monthlyRent": "1500000000000000000000",
    "txHash": "0xabc123...",
    "blockNumber": 7123456,
    "timestamp": 1709251234567
  }'
```

**Expected:** Email should be sent to `your-real-email@gmail.com`

## Validation Test Cases

### Test 1: Invalid Email Format
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "email": "invalid-email"
  }'
# Expected: 400 Bad Request - "Invalid email format"
```

### Test 2: Invalid Wallet Address
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xinvalid",
    "email": "test@example.com"
  }'
# Expected: 400 Bad Request - "Invalid wallet address format"
```

### Test 3: Duplicate Email
```bash
# Register first user
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "email": "duplicate@example.com",
    "name": "User 1"
  }'

# Try to register second user with same email
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "email": "duplicate@example.com",
    "name": "User 2"
  }'
# Expected: 409 Conflict - "Email already registered to another wallet address"
```

### Test 4: Missing Required Fields
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
# Expected: 400 Bad Request - "Missing required fields: walletAddress, email"
```

## MongoDB Queries

Check data directly in MongoDB:

```bash
# Connect to MongoDB
mongosh

# Switch to database
use chainlease

# View all users
db.users.find().pretty()

# Find user by address
db.users.findOne({ address: "0x742d35cc6634c0532925a3b844bc9e7595f0beb" })

# Find user by email
db.users.findOne({ email: "john.doe@example.com" })

# Count total users
db.users.countDocuments()

# View all notifications
db.notifications.find().pretty()

# Clean up (delete all test data)
db.users.deleteMany({})
db.notifications.deleteMany({})
```

## Integration with Frontend

Frontend example (React):

```typescript
// Register user on wallet connection
async function registerUser(walletAddress: string) {
  const response = await fetch('http://localhost:3001/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      email: userEmail, // From form input
      name: userName,
      role: 'tenant'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('User registered:', data.user);
  }
}
```

## Common Issues

### Issue: "Database not initialized"
**Solution:** Make sure MongoDB is running and backend called `connectToDatabase()` on startup

### Issue: Email not found during notification
**Solution:** Register the tenant first using `/api/users/register` before triggering lease activation

### Issue: Email not sending
**Solution:** Check Gmail SMTP credentials in `.env` file

## Next Steps

1. ✅ Test user registration endpoint
2. ✅ Verify MongoDB data is saved correctly
3. ✅ Test notification endpoint with registered user
4. ✅ Verify email is sent to correct address
5. ✅ Integrate frontend wallet connection with user registration
6. ✅ Add email verification flow (optional)
7. ✅ Add user profile management UI

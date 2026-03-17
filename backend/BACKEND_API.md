# Stampworth Backend API

A complete NestJS backend for the Stampworth loyalty rewards system with Supabase integration.

## Features

- **Business Authentication**: Sign up & sign in for store owners
- **Customer Management**: User profiles and loyalty cards
- **Loyalty System**: Stamp management and tracking
- **QR Code Scanning**: Generate and validate QR codes
- **Geofencing**: Location-based features and nearby stores/users
- **Rewards System**: Track redeemed rewards
- **Transaction History**: Complete audit trail
- **Admin Dashboard**: Business analytics and statistics

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Location Services**: PostGIS for geofencing
- **Authentication**: Supabase Auth with JWT

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Supabase Setup

Run the SQL schema in your Supabase dashboard:
- Go to SQL Editor
- Create all tables using the provided SQL scripts
- Enable PostGIS extension: `CREATE EXTENSION earthdistance CASCADE;`

### 3. Environment Configuration

Create `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h

NODE_ENV=development
PORT=3000
```

## Running the Backend

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

The backend will be available at `http://localhost:3000`

## API Endpoints

### Health Check

- `GET /api/health` - Server health check
- `GET /api` - Welcome message

### Authentication (Business)

- `POST /api/auth/business/signup` - Register a business
- `POST /api/auth/business/signin` - Sign in to business account
- `POST /api/auth/business/signout` - Sign out

**Request Body (Signup):**
```json
{
  "email": "owner@business.com",
  "password": "password123",
  "businessName": "My Store",
  "ownerName": "John Doe",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "phone": "555-1234"
}
```

### Businesses

- `GET /api/businesses` - Get all active businesses
- `GET /api/businesses/:id` - Get specific business
- `GET /api/businesses/email/:email` - Get business by owner email
- `PUT /api/businesses/:id` - Update business info
- `GET /api/businesses/:id/stats` - Get business statistics

**Response (Get Businesses):**
```json
{
  "id": "uuid",
  "name": "Business Name",
  "address": "123 Main St",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "geofence_radius_meters": 500,
  "stamps_per_reward": 10
}
```

### Users

- `GET /api/users/:id` - Get user by ID
- `GET /api/users/email/:email` - Get user by email
- `PUT /api/users/:id` - Update user profile

### Loyalty Cards (Card Collection)

- `POST /api/loyalty-cards` - Create a new loyalty card
- `GET /api/loyalty-cards/user/:userId` - Get user's loyalty cards
- `GET /api/loyalty-cards/business/:businessId` - Get business customers
- `GET /api/loyalty-cards/:cardId` - Get card details

**Request Body (Create Card):**
```json
{
  "userId": "user-uuid",
  "businessId": "business-uuid"
}
```

### Stamps

- `POST /api/stamps` - Add stamp to customer
- `GET /api/stamps/card/:loyaltyCardId` - Get card stamps
- `GET /api/stamps/user/:userId` - Get user's all stamps
- `GET /api/stamps/business/:businessId` - Get business stamp activity

**Request Body (Add Stamp):**
```json
{
  "loyaltyCardId": "card-uuid",
  "businessId": "business-uuid",
  "userId": "user-uuid",
  "qrCodeId": "qr-uuid",
  "notes": "Purchased items"
}
```

### QR Codes

- `POST /api/qr-codes` - Create store QR code
- `GET /api/qr-codes/business/:businessId` - Get business QR codes
- `POST /api/qr-codes/validate/:codeValue` - Validate QR code
- `PATCH /api/qr-codes/:id/deactivate` - Deactivate QR code
- `POST /api/qr-codes/customer/:userId` - Generate customer QR code
- `GET /api/qr-codes/customer/:userId` - Get customer QR codes

**Request Body (Create QR Code):**
```json
{
  "businessId": "business-uuid",
  "codeValue": "QR123456",
  "codeImageUrl": "https://..."
}
```

### Transactions

- `GET /api/transactions/business/:businessId` - Get business transactions
- `GET /api/transactions/user/:userId` - Get user transactions
- `GET /api/transactions/card/:cardId` - Get card transactions

### Rewards

- `POST /api/rewards/redeem` - Redeem reward for stamps
- `GET /api/rewards/user/:userId` - Get user's redeemed rewards
- `GET /api/rewards/business/:businessId` - Get business redeemed rewards
- `GET /api/rewards/validate/:rewardCode` - Validate reward code
- `POST /api/rewards/:rewardCode/use` - Mark reward as used

**Request Body (Redeem):**
```json
{
  "loyaltyCardId": "card-uuid",
  "businessId": "business-uuid",
  "userId": "user-uuid",
  "stampsUsed": 10
}
```

### Locations (Geofencing)

- `GET /api/locations/nearby-stores?latitude=40.7128&longitude=-74.0060&maxDistance=5000` - Find nearby stores
- `GET /api/locations/nearby-users/:businessId?maxDistance=1000` - Find nearby users
- `POST /api/locations/check-geofence` - Check if user in store geofence
- `POST /api/locations/update-location` - Update user location
- `GET /api/locations/store-visits/:businessId` - Get store visits
- `POST /api/locations/store-visit` - Create store visit record

**Request Body (Update Location):**
```json
{
  "userId": "user-uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10
}
```

## Database Schema Overview

### Core Tables

- `users` - Customer profiles
- `businesses` - Store information
- `business_users` - Store staff accounts
- `loyalty_cards` - Customer cards (one per store)
- `stamps` - Individual stamps earned
- `qr_codes` - Store QR codes
- `customer_qr_codes` - Customer QR codes
- `transactions` - Transaction history
- `redeemed_rewards` - Rewards redeemed
- `user_locations` - User location history
- `store_visits` - Store visit records
- `nearby_user_activities` - Real-time nearby user activity

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Error message",
  "timestamp": "2026-03-18T12:00:00.000Z"
}
```

## Authentication Flow

### Business Sign Up
1. POST to `/api/auth/business/signup`
2. Creates auth user in Supabase
3. Creates business record
4. Returns userId and businessId

### Business Sign In
1. POST to `/api/auth/business/signin`
2. Returns JWT token and business data
3. Use token in Authorization header for protected routes

## Project Structure

```
src/
├── config/
│   └── supabase.config.ts
├── common/
│   ├── dto/
│   │   └── response.dto.ts
│   └── filters/
│       └── http-exception.filter.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── businesses/
│   ├── loyalty-cards/
│   ├── stamps/
│   ├── qr-codes/
│   ├── transactions/
│   ├── rewards/
│   └── locations/
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

## Best Practices

1. **Always validate input** - DTOs handle validation
2. **Use UUIDs** - All IDs are UUID format
3. **Track creation/update times** - Timestamps included automatically
4. **Check geofence** - Before allowing stamp additions
5. **Maintain transaction history** - Every action is logged
6. **Handle errors gracefully** - Global exception filter in place

## Useful Tools

- **Supabase Studio** - Database management at `https://supabase.com`
- **Postman** - Test API endpoints
- **PostgreSQL Extensions** - PostGIS for geospatial queries

## Next Steps

1. Install dependencies: `npm install`
2. Update .env with Supabase credentials
3. Run migrations in Supabase
4. Start development: `npm run start:dev`
5. Test endpoints using Postman or similar tool
6. Connect mobile apps to backend URLs

## Support

For issues or questions, refer to:
- [NestJS Documentation](https://docs.nestjs.com)
- [Supabase Documentation](https://supabase.com/docs)
- Project repository

---

**Version**: 1.0.0
**Last Updated**: March 2026

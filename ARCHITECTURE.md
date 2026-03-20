# Stampworth Architecture: Customer & Business Pathways

This document defines the complete architecture for separating customer and business app flows with distinct database schemas and API pathways.

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [Authentication Flows](#authentication-flows)
3. [API Endpoints](#api-endpoints)
4. [Real-time Operations](#real-time-operations)
5. [Data Models](#data-models)

---

## Database Schema

### Enhanced Tables Structure

#### 1. **customers** (Users - Customer App)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  phone_number VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 2. **merchants** (Businesses - Business App)
```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  owner_email VARCHAR UNIQUE NOT NULL,
  business_name VARCHAR NOT NULL,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  postal_code VARCHAR,
  country VARCHAR,
  latitude FLOAT,
  longitude FLOAT,
  geofence_radius_meters INT DEFAULT 500,
  phone_number VARCHAR,
  logo_url VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 3. **customer_qr_codes** (Customer Identity QR)
```sql
CREATE TABLE customer_qr_codes (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  qr_code_value VARCHAR UNIQUE NOT NULL,
  qr_code_image_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 4. **merchant_qr_codes** (Store Scanner QR)
```sql
CREATE TABLE merchant_qr_codes (
  id UUID PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  qr_code_value VARCHAR UNIQUE NOT NULL,
  qr_code_image_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  times_scanned INT DEFAULT 0,
  last_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 5. **loyalty_cards** (Customer's Card at Business)
```sql
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  stamp_count INT DEFAULT 0,
  total_stamps_earned INT DEFAULT 0,
  status VARCHAR DEFAULT 'ACTIVE', -- ACTIVE, FREE_REDEMPTION, REDEEMED, EXPIRED
  is_free_redemption BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(customer_id, merchant_id)
);
```

#### 6. **stamp_settings** (Business Configuration)
```sql
CREATE TABLE stamp_settings (
  id UUID PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  stamps_per_redemption INT DEFAULT 10,
  redemption_reward_description VARCHAR,
  promotion_text VARCHAR,
  promotion_active BOOLEAN DEFAULT false,
  promotion_start_date TIMESTAMP,
  promotion_end_date TIMESTAMP,
  stamp_color VARCHAR DEFAULT '#FF6B6B',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(merchant_id)
);
```

#### 7. **stamps** (Individual Stamps)
```sql
CREATE TABLE stamps (
  id UUID PRIMARY KEY,
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  earned_date TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 8. **transactions** (Activity Log)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  loyalty_card_id UUID REFERENCES loyalty_cards(id),
  transaction_type VARCHAR, -- 'STAMP_EARNED', 'STAMP_REMOVED', 'REDEEMED', 'PROMOTION'
  stamp_count_after INT,
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 9. **redeemed_rewards** (Redemption History)
```sql
CREATE TABLE redeemed_rewards (
  id UUID PRIMARY KEY,
  loyalty_card_id UUID REFERENCES loyalty_cards(id),
  merchant_id UUID REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  stamps_used INT,
  reward_code VARCHAR UNIQUE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 10. **user_locations** (Geofencing)
```sql
CREATE TABLE user_locations (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  latitude FLOAT,
  longitude FLOAT,
  accuracy_meters INT,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 11. **store_visits** (Visit Tracking)
```sql
CREATE TABLE store_visits (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  merchant_id UUID REFERENCES merchants(id),
  visit_latitude FLOAT,
  visit_longitude FLOAT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Authentication Flows

### Customer Auth Flow

#### Sign Up
```
POST /api/auth/customer/signup
{
  "email": "customer@example.com",
  "password": "secure_password",
  "username": "unique_username",
  "fullName": "John Customer"
}
```

**Returns:**
```json
{
  "success": true,
  "customerId": "uuid",
  "authToken": "jwt_token"
}
```

#### Generate Customer QR Code
- Triggered after successful signup
- Creates unique QR code for customer identity
- Used by business app to identify customer

#### Sign In
```
POST /api/auth/customer/signin
{
  "email": "customer@example.com",
  "password": "secure_password"
}
```

### Business/Merchant Auth Flow

#### Sign Up
```
POST /api/auth/merchant/signup
{
  "email": "owner@business.com",
  "password": "secure_password",
  "businessName": "My Store",
  "address": "123 Main St",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "phone": "555-1234"
}
```

**Returns:**
```json
{
  "success": true,
  "merchantId": "uuid",
  "authToken": "jwt_token"
}
```

#### Auto-Create Stamp Settings
- On merchant signup, create default `stamp_settings`
- Default: 10 stamps per redemption
- Merchant can customize later

#### Sign In
```
POST /api/auth/merchant/signin
{
  "email": "owner@business.com",
  "password": "secure_password"
}
```

---

## API Endpoints

### CUSTOMER APP ENDPOINTS

#### Authentication
- `POST /api/auth/customer/signup` - Register customer
- `POST /api/auth/customer/signin` - Login customer
- `POST /api/auth/customer/signout` - Logout
- `GET /api/auth/customer/me` - Get current customer

#### Profile
- `GET /api/customers/:customerId` - Get customer profile
- `PUT /api/customers/:customerId` - Update profile
- `GET /api/customers/:customerId/qr-code` - Get customer QR code

#### Cards
- `GET /api/loyalty-cards/customer/:customerId` - Get all cards
- `GET /api/loyalty-cards/:cardId` - Get card details
- `GET /api/loyalty-cards/:cardId/stamps` - Get stamps on card
- `GET /api/loyalty-cards/:cardId/status` - Check card status (includes FREE_REDEMPTION status)

#### Transactions
- `GET /api/transactions/customer/:customerId` - Get transaction history
- `GET /api/rewards/customer/:customerId` - Get redeemed rewards

#### Locations
- `POST /api/locations/customer/update` - Update location
- `GET /api/locations/nearby-merchants?lat=X&lon=Y` - Find nearby stores

---

### BUSINESS/MERCHANT APP ENDPOINTS

#### Authentication
- `POST /api/auth/merchant/signup` - Register merchant
- `POST /api/auth/merchant/signin` - Login merchant
- `POST /api/auth/merchant/signout` - Logout
- `GET /api/auth/merchant/me` - Get current merchant

#### Profile
- `GET /api/merchants/:merchantId` - Get merchant profile
- `PUT /api/merchants/:merchantId` - Update merchant info
- `GET /api/merchants/:merchantId/stats` - Get business statistics

#### Stamp Settings (Configuration)
- `GET /api/stamp-settings/:merchantId` - Get stamp configuration
- `PUT /api/stamp-settings/:merchantId` - Update stamp settings
- `GET /api/stamp-settings/:merchantId/promotions` - Get promotions

#### QR Code Management
- `POST /api/qr-codes/merchant` - Create store QR code
- `GET /api/qr-codes/merchant/:merchantId` - Get all store QR codes
- `PATCH /api/qr-codes/:qrCodeId/activate` - Activate QR code
- `PATCH /api/qr-codes/:qrCodeId/deactivate` - Deactivate QR code

#### Scanner Operations
- `POST /api/scanner/resolve` - Scan/search customer QR code
  ```json
  {
    "qrCodeValue": "CUSTOMER_QR_VALUE"
  }
  ```
  Returns: Customer's card for this merchant (if exists)

- `POST /api/scanner/add-stamp` - Add stamp to customer card
  ```json
  {
    "loyaltyCardId": "uuid",
    "customerId": "uuid",
    "quantity": 1,
    "notes": "Purchase note"
  }
  ```

- `POST /api/scanner/remove-stamp` - Remove stamp from card
  ```json
  {
    "loyaltyCardId": "uuid",
    "quantity": 1
  }
  ```

#### Card Management
- `GET /api/loyalty-cards/merchant/:merchantId` - Get all customer cards
- `GET /api/loyalty-cards/:cardId/details` - Get card with customer info
- `GET /api/loyalty-cards/:cardId/redemption-status` - Check if FREE_REDEMPTION

#### Transactions
- `GET /api/transactions/merchant/:merchantId` - Get transaction history
- `GET /api/rewards/merchant/:merchantId` - Get redeemed rewards
- `POST /api/rewards/process-redemption` - Process card redemption
  ```json
  {
    "loyaltyCardId": "uuid",
    "rewardCode": "UNIQUE_CODE"
  }
  ```

#### Locations
- `GET /api/merchants/:merchantId/location` - Get store location
- `PUT /api/merchants/:merchantId/location` - Update store location
- `GET /api/locations/nearby-customers/:merchantId` - Get nearby customers

---

## Real-time Operations

### Stamp Increment/Decrement Flow

#### When Business Scans Customer QR:
1. Validate customer QR code
2. Check if loyalty card exists for merchant
3. If not exists → Create card
4. Return card details

#### Adding Stamps (Real-time):
1. Validate merchant authorization
2. Get current stamp count
3. Increment stamp count
4. **Check if reached redemption threshold**:
   - If `stamp_count === stamps_per_redemption`:
     - Set `is_free_redemption = true`
     - Set `status = 'FREE_REDEMPTION'`
     - Create reward code
     - Create transaction record
5. Return updated card state

#### Removing Stamps:
1. Validate merchant authorization
2. Check current stamp count
3. Decrement (prevent negative)
4. Reset `is_free_redemption = false` if needed
5. Create transaction record

#### Customer Redeeming:
1. Validate customer owns card
2. Check `is_free_redemption = true`
3. Set `status = 'REDEEMED'`
4. Mark reward as used
5. Reset card for next cycle

---

## Data Models

### Customer Card State
```typescript
interface LoyaltyCard {
  id: string;
  customerId: string;
  merchantId: string;
  stampCount: number;
  totalStampsEarned: number;
  status: 'ACTIVE' | 'FREE_REDEMPTION' | 'REDEEMED' | 'EXPIRED';
  isFreeRedemption: boolean;
  redeemedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Scanner Result
```typescript
interface ScannerResult {
  loyaltyCard: LoyaltyCard;
  merchant: MerchantInfo;
  customer?: CustomerInfo;
  canAddStamp: boolean;
  stampSettings: StampSettings;
}
```

### Stamp Settings
```typescript
interface StampSettings {
  id: string;
  merchantId: string;
  stampsPerRedemption: number;
  redemptionRewardDescription: string;
  promotionText?: string;
  promotionActive: boolean;
  promotionStartDate?: string;
  promotionEndDate?: string;
  stampColor: string;
}
```

### Transaction Record
```typescript
interface Transaction {
  id: string;
  merchantId: string;
  customerId: string;
  loyaltyCardId: string;
  transactionType: 'STAMP_EARNED' | 'STAMP_REMOVED' | 'REDEEMED' | 'PROMOTION';
  stampCountAfter: number;
  notes?: string;
  createdAt: string;
}
```

---

## Implementation Checklist

### Database Setup
- [ ] Create all new tables in Supabase
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create indexes on frequently queried columns
- [ ] Set up triggers for `updated_at` timestamps

### Backend APIs
- [ ] Create customer auth module
- [ ] Create merchant auth module
- [ ] Implement customer endpoints
- [ ] Implement merchant endpoints
- [ ] Add scanner resolution logic
- [ ] Add stamp increment/decrement operations
- [ ] Add redemption logic
- [ ] Implement transaction logging

### Frontend - Customer App
- [ ] Update auth flow (customer signup/signin)
- [ ] Add QR code generation on signup
- [ ] Update card display with stamps
- [ ] Add "Free Redemption" state display
- [ ] Update database.ts with customer endpoints

### Frontend - Business App
- [ ] Update auth flow (merchant signin)
- [ ] Add stamp settings UI
- [ ] Implement QR code scanner
- [ ] Add stamp add/remove buttons
- [ ] Add real-time card state display
- [ ] Update database.ts with merchant endpoints

### Security
- [ ] Implement RLS policies (customer can only see own cards)
- [ ] Implement RLS policies (merchant can only manage own cards)
- [ ] Validate merchant ownership before operations
- [ ] Validate customer ownership before redemption

---

## Next Steps

1. **Database Migration**: Run SQL scripts to create all tables
2. **API Implementation**: Build backend endpoints in NestJS
3. **Frontend Integration**: Update both apps to use new endpoints
4. **Testing**: Test complete flows end-to-end
5. **Deployment**: Deploy to staging and production


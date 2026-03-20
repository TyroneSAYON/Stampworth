# Stampworth Quick Reference Guide

Fast lookup guide for critical information about the two-pathway architecture.

---

## System Overview at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                   STAMPWORTH LOYALTY SYSTEM                 │
├──────────────────────────┬──────────────────────────────────┤
│  CUSTOMER APP            │  BUSINESS APP                    │
├──────────────────────────┼──────────────────────────────────┤
│ • Unique QR Code (ID)    │ • Scanner                        │
│ • Unique Username        │ • Stamp Add/Remove               │
│ • Multiple Cards         │ • Configuration                  │
│ • Stamp Count Visible    │ • Real-time Operations          │
│ • FREE REDEMPTION Badge  │ • FREE REDEMPTION Trigger       │
│ • Location Tracking      │ • Transaction Logging           │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Key Concepts

### FREE REDEMPTION State
- **What:** When a customer earns enough stamps (threshold) to claim a reward
- **How:** Backend auto-detects when `stamp_count === stamps_per_redemption`
- **Trigger:** When merchant adds stamp via scanner
- **Display:** 
  - Customer app: GREEN badge "FREE REDEMPTION"
  - Business app: Alert with reward code
- **Reset:** After customer redeems with the reward code

### Stamp Settings
- Per-merchant configuration
- Default: 10 stamps per redemption
- Can be customized by merchant
- Affects FREE REDEMPTION trigger point
- Independent per business

### Customer QR Code
- Generated automatically on signup
- Unique identifier for customer
- Scanned by merchant app
- Used to link to loyalty card
- Never expires (is_active = true)

### Loyalty Card
- One per customer-merchant pair
- Created (dynamically or on-demand by scanner)
- Tracks stamp count
- Shows redemption status
- Resets after redemption

---

## Critical Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `customers` | Customer accounts | id, auth_id, email, username, full_name |
| `merchants` | Business accounts | id, auth_id, owner_email, business_name, latitude, longitude |
| `customer_qr_codes` | Customer IDs | id, customer_id, qr_code_value, is_active |
| `loyalty_cards` | Cards at merchants | id, customer_id, merchant_id, stamp_count, is_free_redemption, status |
| `stamp_settings` | Config per merchant | id, merchant_id, stamps_per_redemption |
| `stamps` | Individual records | id, loyalty_card_id, earned_date, is_valid |
| `transactions` | Activity log | id, transaction_type, stamp_count_after |
| `redeemed_rewards` | Redemption history | id, loyalty_card_id, reward_code, is_used |

---

## Core API Flows

### 1. CUSTOMER SIGNUP
```
POST /api/auth/customer/signup
{
  "email": "customer@example.com",
  "password": "password123",
  "username": "john_doe",       // ← UNIQUE
  "fullName": "John Doe"
}

RESPONSE:
{
  "customerId": "uuid",
  "qrCode": { id, qr_code_value, qr_code_image_url }
}
```

### 2. MERCHANT SIGNUP
```
POST /api/auth/merchant/signup
{
  "email": "owner@business.com",
  "password": "password123",
  "businessName": "My Store",
  "latitude": 40.7128,
  "longitude": -74.0060
}

RESPONSE:
{
  "merchantId": "uuid",
  "stampSettings": { stamps_per_redemption: 10 }
}
```

### 3. SCAN QR CODE (Core Operation)
```
POST /api/scanner/resolve
{
  "qrCodeValue": "CUSTOMER_UUID_TIMESTAMP"
}

RESPONSE:
{
  "loyaltyCard": { id, stamp_count, is_free_redemption, status },
  "customer": { id, email, fullName },
  "stampSettings": { stamps_per_redemption: 10 }
}
```

### 4. ADD STAMP (with Auto-Detection)
```
POST /api/scanner/add-stamp
{
  "loyaltyCardId": "uuid",
  "customerId": "uuid",
  "quantity": 1,
  "notes": "Purchase note"
}

RESPONSE:
{
  "card": { stamp_count: 10, is_free_redemption: true, status: "FREE_REDEMPTION" },
  "isRedemptionReached": true,
  "rewardCode": "REWARD_ABC123XY"
}
```

### 5. REDEEM CARD
```
POST /api/scanner/redeem
{
  "loyaltyCardId": "uuid",
  "customerId": "uuid",
  "rewardCode": "REWARD_ABC123XY"
}

RESPONSE:
{
  "card": { stamp_count: 0, is_free_redemption: false, status: "REDEEMED" }
}
```

---

## Frontend Key Functions

### Customer App

```typescript
// Auth
await customerSignUp(email, password, username, fullName)
await customerSignIn(email, password)

// Cards
await getUserLoyaltyCards(customerId)
await getCardStatus(cardId)  // Check for FREE_REDEMPTION
await getCardStamps(cardId)

// Display
// Show GREEN badge if isFreeRedemption = true
```

### Business App

```typescript
// Auth
await merchantSignUp(email, password, businessName, latitude, longitude)
await merchantSignIn(email, password)

// Scanner
await resolveCustomerQRCode(qrCodeValue)

// Operations
await addStampToCard(loyaltyCardId, customerId, quantity)
await removeStampFromCard(loyaltyCardId, customerId, quantity)
await processRedemption(loyaltyCardId, customerId, rewardCode)

// Settings
await getStampSettings(merchantId)
await updateStampSettings(merchantId, { stampsPerRedemption: 10 })
```

---

## Common Status Values

### Card Status (loyalty_cards)
- `'ACTIVE'` - Normal, collecting stamps
- `'FREE_REDEMPTION'` - Ready to redeem
- `'REDEEMED'` - Just redeemed, will reset next cycle
- `'EXPIRED'` - Stamp expiration date passed

### Transaction Type (transactions)
- `'STAMP_EARNED'` - Added via scanner
- `'STAMP_REMOVED'` - Removed by merchant
- `'REDEEMED'` - Card redeemed
- `'PROMOTION'` - Bonus stamps from promotion

---

## Database Relationships

```
customers (1) ──────→ (many) customer_qr_codes
                    ↓
                    └──→ (many) loyalty_cards
                              ↓
merchants (1) ────────────→ (many) loyalty_cards
                              ↓
                              ├──→ (many) stamps
                              ├──→ (many) transactions
                              └──→ (many) redeemed_rewards

merchants (1) ────────→ (1) stamp_settings
```

---

## Important Fields to Check

### Before Adding a Stamp
- ✅ `loyalty_cards.is_free_redemption` - Is it already free?
- ✅ `stamp_settings.stamps_per_redemption` - What's the threshold?
- ✅ `loyalty_cards.status` - Is it ACTIVE?

### For Redemption
- ✅ `loyalty_cards.is_free_redemption` - Must be true
- ✅ `redeemed_rewards.is_used` - Must be false
- ✅ `redeemed_rewards.reward_code` - Must match

### For Merchant QR Codes
- ✅ Is `is_active = true`?
- ✅ Does `merchant_id` match current session?

---

## Authentication Headers

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Error Codes & Messages

| Scenario | Error | Solution |
|----------|-------|----------|
| Username taken | ConflictException | User should pick different username |
| Invalid QR | NotFoundException | Verify QR code is not expired |
| No card for merchant | Auto-creates | System creates card on first scan |
| Stamp limit | BadRequestException | Can't go below 0 stamps |
| Reward already used | ConflictException | Reward code was already redeemed |
| Insufficient stamps | BadRequestException | Merchant tries to remove too many |

---

## Environment Variables Needed

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h
NODE_ENV=development
PORT=3000
```

### Frontend (.env.local)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Testing Critical Paths

### Path 1: Customer Creates Account
```
1. Sign up with unique username → ✅
2. QR code auto-generated → ✅
3. Can sign in → ✅
4. Can see their QR code → ✅
```

### Path 2: Merchant Creates Account
```
1. Sign up with business info → ✅
2. Stamp settings auto-created (default: 10) → ✅
3. Can sign in → ✅
4. Can customize settings → ✅
```

### Path 3: Scanner Workflow
```
1. Merchant scans customer QR → ✅
2. Card created if doesn't exist → ✅
3. Can add stamp → ✅
4. After 10 stamps, is_free_redemption = true → ✅
5. Alert shows reward code → ✅
6. Merchant redeems with code → ✅
7. Card resets (stamp_count = 0) → ✅
8. Can repeat cycle → ✅
```

---

## Performance Considerations

### Indexes to Verify
- ✅ `customers(email)` - Signup lookups
- ✅ `merchants(owner_email)` - Auth lookups
- ✅ `loyalty_cards(customer_id, merchant_id)` - Card lookups
- ✅ `customer_qr_codes(qr_code_value)` - Scanner resolution
- ✅ `stamps(loyalty_card_id)` - Stamp count queries

### RLS Policies to Test
- ✅ Customers can only see own data
- ✅ Merchants can only modify own cards
- ✅ Transaction queries respects ownership

---

## Migration from Old System (If Applicable)

If migrating from old `qr_codes`, `users`, etc. tables:

1. Create new `customers` from old `users` WHERE role = 'customer'
2. Create new `merchants` from old `businesses`
3. Copy `loyalty_cards` relationships
4. Migrate `stamps` data preserving dates
5. Set `customers.auth_id` from Supabase auth
6. Set `merchants.auth_id` from Supabase auth
7. Generate `customer_qr_codes` for each customer
8. Run integrity checks

---

## Troubleshooting Flowchart

```
Issue: Scanner doesn't scan?
├─ Check: Camera permission granted?
├─ Check: QR code is valid format?
└─ Check: QR value exists in database?

Issue: FREE REDEMPTION not showing?
├─ Check: stamp_count reached threshold?
├─ Check: is_free_redemption = true in DB?
└─ Check: Status = "FREE_REDEMPTION" in DB?

Issue: Redemption not working?
├─ Check: Card is_free_redemption = true?
├─ Check: Reward code exists?
├─ Check: Reward is_used = false?
└─ Check: Card/reward IDs match?

Issue: Cards not appearing?
├─ Check: Customer can sign in?
├─ Check: RLS policies allow read?
└─ Check: Cards created with customer_id = auth user?
```

---

## Quick Deploy Checklist

Before going live:

- [ ] Database migrations run successfully
- [ ] All indices created
- [ ] RLS policies enabled
- [ ] Backend API tested in staging
- [ ] Auth flows tested end-to-end
- [ ] Scanner tested with actual QR codes
- [ ] FREE REDEMPTION tested 10+ times
- [ ] Redemption flow tested 10+ times
- [ ] Customer app APK/IPA tested
- [ ] Business app APK/IPA tested
- [ ] Backend deployed to production
- [ ] Frontend apps uploaded to stores
- [ ] Monitoring set up (Sentry, etc.)
- [ ] Support docs written

---

## Key Takeaways

**Customer App:**
- Users are unique by username
- Auto QR code on signup
- See stamp count + FREE REDEMPTION badge clearly
- Can redeem at merchant

**Business App:**
- Merchant scans = instant card lookup/creation
- Add stamp = auto-checks for FREE_REDEMPTION
- Reach threshold = reward code generated
- Merchant shows code to customer for redemption

**Backend:**
- All logic is transaction-driven
- Status updates happen atomically
- RLS protects customer/merchant data
- Geofencing ready but optional initially


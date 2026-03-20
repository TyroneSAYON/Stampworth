# Stampworth Implementation Roadmap

Complete step-by-step roadmap for implementing the customer and business app pathways.

---

## Phase 1: Database Setup (Week 1)

### Database Migration
- [ ] Run SQL migration script in Supabase SQL Editor: `DATABASE_MIGRATION.sql`
- [ ] Verify all tables are created
- [ ] Test table relationships
- [ ] Enable PostGIS extension
- [ ] Setup Row Level Security (RLS) policies
- [ ] Create indexes for performance

### Database Verification
- [ ] Verify `customers` table created
- [ ] Verify `merchants` table created
- [ ] Verify `customer_qr_codes` table created
- [ ] Verify `loyalty_cards` table relationships
- [ ] Verify `stamps` table structure
- [ ] Verify `stamp_settings` table created
- [ ] Verify `transactions` table created
- [ ] Verify `redeemed_rewards` table created

**Deliverable:** Fully functional Supabase database with all tables and relationships

---

## Phase 2: Backend API Development (Week 2-3)

### Authentication Module
- [ ] Create customer signup DTO
- [ ] Create customer signin DTO
- [ ] Create merchant signup DTO
- [ ] Create merchant signin DTO
- [ ] Implement AuthService with all 4 auth flows
- [ ] Create AuthController with routes
- [ ] Implement JWT strategy
- [ ] Create JWT guard for protected routes
- [ ] Test all auth endpoints

**API Endpoints:**
```
POST /api/auth/customer/signup
POST /api/auth/customer/signin
POST /api/auth/merchant/signup
POST /api/auth/merchant/signin
POST /api/auth/signout
```

### Scanner & Stamp Operations Module
- [ ] Create ScannerService with resolveQRCode()
- [ ] Implement addStamp() logic with FREE_REDEMPTION check
- [ ] Implement removeStamp() logic
- [ ] Implement processRedemption() logic
- [ ] Create ScannerController
- [ ] Create CurrentMerchant decorator
- [ ] Create CurrentCustomer decorator
- [ ] Test all scanner operations

**API Endpoints:**
```
POST /api/scanner/resolve
POST /api/scanner/add-stamp
POST /api/scanner/remove-stamp
POST /api/scanner/redeem
```

### Loyalty Cards Module
- [ ] Create loyalty cards service
- [ ] Implement getCustomerCards()
- [ ] Implement getMerchantCards()
- [ ] Implement getCardDetails()
- [ ] Implement getCardStatus() (includes isFreeRedemption)
- [ ] Create controller with routes
- [ ] Test all endpoints

**API Endpoints:**
```
GET /api/loyalty-cards/customer/:customerId
GET /api/loyalty-cards/merchant/:merchantId
GET /api/loyalty-cards/:cardId
GET /api/loyalty-cards/:cardId/status
GET /api/loyalty-cards/:cardId/stamps
```

### Stamp Settings Module
- [ ] Create stamp settings service
- [ ] Implement getStampSettings()
- [ ] Implement updateStampSettings()
- [ ] Implement automatic default on merchant signup
- [ ] Create controller with routes

**API Endpoints:**
```
GET /api/stamp-settings/:merchantId
PUT /api/stamp-settings/:merchantId
GET /api/stamp-settings/:merchantId/promotions
```

### Transactions & Rewards Modules
- [ ] Create transactions service
- [ ] Implement getCustomerTransactions()
- [ ] Implement getMerchantTransactions()
- [ ] Create rewards service
- [ ] Implement getCustomerRewards()
- [ ] Implement getMerchantRewards()
- [ ] Test all endpoints

**API Endpoints:**
```
GET /api/transactions/customer/:customerId
GET /api/transactions/merchant/:merchantId
GET /api/rewards/customer/:customerId
GET /api/rewards/merchant/:merchantId
```

### Customer Profile Module
- [ ] Create customers service
- [ ] Implement getCustomerProfile()
- [ ] Implement updateCustomerProfile()
- [ ] Implement getCustomerQRCode()
- [ ] Create controller

**API Endpoints:**
```
GET /api/customers/:customerId
PUT /api/customers/:customerId
GET /api/customers/:customerId/qr-code
```

### Merchant Profile Module
- [ ] Create merchants service
- [ ] Implement getMerchantProfile()
- [ ] Implement updateMerchantProfile()
- [ ] Implement getMerchantStats()
- [ ] Create controller

**API Endpoints:**
```
GET /api/merchants/:merchantId
PUT /api/merchants/:merchantId
GET /api/merchants/:merchantId/stats
```

### Location & Geofencing Module
- [ ] Create locations service
- [ ] Implement updateCustomerLocation()
- [ ] Implement findNearbyMerchants()
- [ ] Implement findNearbyCustomers()
- [ ] Implement checkGeofence()
- [ ] Create controller

**API Endpoints:**
```
POST /api/locations/customer/update
GET /api/locations/nearby-merchants?lat=X&lon=Y
GET /api/locations/nearby-customers/:merchantId
POST /api/locations/check-geofence
```

**Deliverable:** Complete backend API with all endpoints functional

---

## Phase 3: Frontend - Customer App (Week 3-4)

### Authentication UI
- [ ] Update login screen for customer
- [ ] Create customer signup screen
- [ ] Add username field and validation
- [ ] Implement signup with username uniqueness check
- [ ] Handle QR code generation response
- [ ] Update auth.ts with new endpoints
- [ ] Test signup flow end-to-end

### Dashboard & Cards View
- [ ] Update main cards view
- [ ] Implement stamp counter display
- [ ] Add visual stamp indicators
- [ ] Create FREE REDEMPTION badge component
- [ ] Load card status on render
- [ ] Refresh card status periodically
- [ ] Test card display with different states

### Card Details Screen
- [ ] Create card details view
- [ ] Show merchant info
- [ ] Display stamp counter
- [ ] Show stamps earned historically
- [ ] Show FREE REDEMPTION indicator
- [ ] Add button to view redemption history

### Rewards & History
- [ ] Get redeemed rewards list
- [ ] Display transaction history
- [ ] Show reward codes
- [ ] Test history loading

### Location Features
- [ ] Request location permissions
- [ ] Implement background location tracking
- [ ] Find nearby stores
- [ ] Show on map

**Deliverable:** Fully functional customer app with card management and FREE REDEMPTION display

---

## Phase 4: Frontend - Business App (Week 4-5)

### Authentication UI
- [ ] Update login screen for merchant
- [ ] Create merchant signup screen
- [ ] Add business info fields
- [ ] Add location fields (lat/lon)
- [ ] Update auth.ts with merchant endpoints
- [ ] Test signup and automatic stamp settings creation

### Scanner Implementation
- [ ] Implement QR code scanner
- [ ] Request camera permissions
- [ ] Add barcode scanning library (react-native-vision-camera)
- [ ] Implement resultresolveCustomerQRCode() call
- [ ] Display customer info on scan

### Stamp Operations UI
- [ ] Create scanner result screen
- [ ] Add "Add Stamp" button with quantity selector
- [ ] Add "Remove Stamp" button
- [ ] Show customer name & current stamp count
- [ ] Display FREE REDEMPTION alert
- [ ] Handle stamp operation responses

### FREE REDEMPTION Flow
- [ ] Show alert when FREE_REDEMPTION reached
- [ ] Display reward code
- [ ] Add "Redeem" button
- [ ] Implement processRedemption() call
- [ ] Show success message with confetti animation

### Stamp Settings UI
- [ ] Create settings screen
- [ ] Show current stamps_per_redemption
- [ ] Add form to update settings
- [ ] Add promotion text editor
- [ ] Toggle promotion active/inactive
- [ ] Test settings save and reload

### Dashboard & Analytics
- [ ] Create merchant dashboard
- [ ] Show recent transactions
- [ ] Show nearby customers
- [ ] Display business stats
- [ ] Show QR codes management

**Deliverable:** Fully functional business app with scanner and real-time stamp operations

---

## Phase 5: Integration Testing (Week 5)

### End-to-End Flows
- [ ] Test complete customer signup → card creation flow
- [ ] Test merchant signup → default settings creation
- [ ] Test scanner QR resolution → card retrieval
- [ ] Test add stamp → FREE_REDEMPTION trigger
- [ ] Test redemption process → card reset
- [ ] Test remove stamp operation
- [ ] Test multiple cards per customer
- [ ] Test geofencing functionality

### Real-time Operations
- [ ] Test stamp count updates in real-time
- [ ] Test customer app reflects merchant changes
- [ ] Test transaction logging accuracy
- [ ] Test reward code generation

### Error Handling
- [ ] Test invalid QR codes
- [ ] Test duplicate operations
- [ ] Test permission errors
- [ ] Test network errors
- [ ] Test database constraints

### Performance Testing
- [ ] Test scanner responsiveness
- [ ] Test card loading speed
- [ ] Test location tracking accuracy
- [ ] Test database query performance

**Deliverable:** Fully tested end-to-end system

---

## Phase 6: Deployment & Launch (Week 6)

### Backend Deployment
- [ ] Deploy to production server
- [ ] Setup environment variables
- [ ] Run database migrations on production
- [ ] Setup monitoring and logging
- [ ] Test all endpoints in production
- [ ] Setup error tracking (Sentry)

### Frontend Deployment
- [ ] Build customer app
- [ ] Test production build
- [ ] Deploy to TestFlight/Play Store (beta)
- [ ] Test on real devices
- [ ] Build business app
- [ ] Deploy to TestFlight/Play Store (beta)
- [ ] Test on real devices

### Launch Preparation
- [ ] Create user documentation
- [ ] Create help videos
- [ ] Setup customer support
- [ ] Create FAQ
- [ ] Prepare marketing materials

### Launch
- [ ] Release customer app to App Store/Play Store
- [ ] Release business app to App Store/Play Store
- [ ] Monitor for issues
- [ ] Respond to user feedback

---

## Key Data Flows

### Customer Signup
```
1. Customer enters: email, password, username, fullName
2. Backend creates auth user + customer profile
3. Auto-generates customer QR code
4. Returns token + QR code
5. Customer logs in with generated QR
```

### Merchant Signup
```
1. Merchant enters: email, password, businessName, location
2. Backend creates auth user + merchant profile
3. Auto-creates default stamp_settings (10 stamps per reward)
4. Returns token + merchant data
5. Merchant can customize settings later
```

### Scanner Flow (Core)
```
1. Merchant opens scanner
2. Scans customer QR code
3. System resolves QR → finds customer
4. Checks if loyalty card exists for merchant
5. If not, creates new card (stamp_count = 0)
6. Returns card + customer + settings
7. Merchant can add/remove stamps or process redemption
```

### Add Stamp Flow
```
1. Merchant clicks "Add Stamp"
2. stamp_count increments
3. Check: stamp_count === stamps_per_redemption?
4. If YES:
   - Set is_free_redemption = true
   - Set status = 'FREE_REDEMPTION'
   - Generate reward_code
   - Show alert with reward code
5. If NO:
   - Just show updated count
6. Create transaction record
7. Return updated card
```

### Redemption Flow
```
1. Customer sees "FREE REDEMPTION" badge
2. Customer shows reward code to merchant
3. Merchant enters reward code in system
4. System validates code + card
5. Updates card: status = 'REDEEMED', stamp_count = 0
6. Marks reward as used
7. Customer card resets for next cycle
8. Create transaction record
```

---

## Testing Checklist

### Unit Tests
- [ ] AuthService signup/signin
- [ ] ScannerService QR resolution
- [ ] ScannerService stamp operations
- [ ] LoyaltyCard status logic
- [ ] Transaction logging
- [ ] Reward generation

### Integration Tests
- [ ] Customer signup → card auto-creation
- [ ] Merchant signup → settings auto-creation
- [ ] Scanner → card retrieval/creation
- [ ] Add stamp → FREE_REDEMPTION check
- [ ] Redemption → card reset

### E2E Tests (Real Device)
- [ ] Customer signup + QR code generation
- [ ] Merchant signup + settings
- [ ] Scan customer QR code
- [ ] Add stamps until FREE_REDEMPTION
- [ ] Redeem with proper code
- [ ] Card resets
- [ ] Next cycle works properly

---

## Success Criteria

✅ Customer App:
- Users can signup with unique username
- Automatic QR code generated on signup
- Can view all loyalty cards with stamp count
- Shows FREE REDEMPTION when threshold reached
- Can see transaction history

✅ Business App:
- Merchants can signup and configure settings
- Scanner works and resolves customer QR codes
- Can add/remove stamps in real-time
- FREE REDEMPTION automatically triggered
- Can redeem customers with reward code
- Settings allow customization of stamps_per_reward

✅ Backend:
- All auth flows working
- Scanner operations reliable
- Real-time updates work
- Transactions logged accurately
- RLS policies secure data
- Geofencing functional

---

## Common Issues & Troubleshooting

### Issue: FREE REDEMPTION not showing
- Check: timestamps_per_redemption in database
- Verify: stamp_count calculation is correct
- Test: manually update is_free_redemption

### Issue: QR code generation fails
- Check: customer table has auth_id
- Verify: customer_qr_codes table writable
- Test: QR code value is unique

### Issue: Scanner doesn't resolve customer
- Check: QR code value matches exactly
- Verify: customer_qr_codes has is_active = true
- Test: try different QR code

### Issue: Stamp count not updating
- Check: loyalty_cards table updated
- Verify: transaction record created
- Test: query database directly

---

## Contact & Support

For issues or questions about implementation:
1. Check ARCHITECTURE.md for data models
2. Check BACKEND_IMPLEMENTATION.md for API details
3. Check FRONTEND_IMPLEMENTATION.md for UI code
4. Review DATABASE_MIGRATION.sql for schema


# Frontend Implementation Guide - Customer & Business Apps

Complete implementation guide for integrating the new database and API endpoints in both Expo apps.

---

## CUSTOMER APP Implementation

### 1. Update Authentication Flow

#### `customerapp/lib/auth.ts`
```typescript
import { supabase } from '@/lib/supabase';

// ========== CUSTOMER SIGN UP ==========
export const customerSignUp = async (
  email: string,
  password: string,
  username: string,
  fullName: string,
) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        username,
        fullName,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    // Store token and customer data
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('customerId', data.customerId);
      await AsyncStorage.setItem('customerQRCode', JSON.stringify(data.qrCode));
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== CUSTOMER SIGN IN ==========
export const customerSignIn = async (email: string, password: string) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/customer/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    // Store token and customer data
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('customerId', data.customer.id);
      await AsyncStorage.setItem('customerData', JSON.stringify(data.customer));
      await AsyncStorage.setItem('customerQRCode', JSON.stringify(data.customer.qrCode));
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== GET CURRENT CUSTOMER ==========
export const getCurrentCustomer = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const customerId = await AsyncStorage.getItem('customerId');
    const customerData = await AsyncStorage.getItem('customerData');

    return {
      token,
      customerId,
      customer: customerData ? JSON.parse(customerData) : null,
    };
  } catch (error) {
    return null;
  }
};

// ========== SIGN OUT ==========
export const signOut = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('customerId');
    await AsyncStorage.removeItem('customerData');
    await AsyncStorage.removeItem('customerQRCode');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### 2. Update Database Functions

#### `customerapp/lib/database.ts`
```typescript
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// ========== LOYALTY CARDS ==========
export const getUserLoyaltyCards = async (customerId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/loyalty-cards/customer/${customerId}`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== GET CARD DETAILS WITH STAMPS ==========
export const getCardDetails = async (cardId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/loyalty-cards/${cardId}`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== GET CARD STAMPS ==========
export const getCardStamps = async (loyaltyCardId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/loyalty-cards/${loyaltyCardId}/stamps`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== GET CARD STATUS (Check for FREE_REDEMPTION) ==========
export const getCardStatus = async (cardId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/loyalty-cards/${cardId}/status`,
      { headers },
    );
    const data = await response.json();
    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.message,
      isFreeRedemption: data?.isFreeRedemption || false,
    };
  } catch (error) {
    return { data: null, error: error.message, isFreeRedemption: false };
  }
};

// ========== GET TRANSACTIONS ==========
export const getUserTransactions = async (customerId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/transactions/customer/${customerId}`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== GET REDEEMED REWARDS ==========
export const getRedeemedRewards = async (customerId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/rewards/customer/${customerId}`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== GET CUSTOMER QR CODE ==========
export const getCustomerQRCode = async (customerId: string) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/customers/${customerId}/qr-code`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== UPDATE USER LOCATION ==========
export const updateUserLocation = async (
  customerId: string,
  latitude: number,
  longitude: number,
  accuracy: number,
) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/locations/customer/update`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId,
          latitude,
          longitude,
          accuracy,
        }),
      },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== FIND NEARBY STORES ==========
export const findNearbyStores = async (latitude: number, longitude: number) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/locations/nearby-merchants?lat=${latitude}&lon=${longitude}`,
      { headers },
    );
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
```

### 3. Update UI Components

#### `customerapp/app/(tabs)/index.tsx` - Show Cards with Stamps & Redemption Status
```typescript
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { getCurrentCustomer } from '@/lib/auth';
import { getUserLoyaltyCards, getCardStatus } from '@/lib/database';

export default function CustomerCardsScreen() {
  const [cards, setCards] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardStatuses, setCardStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const customer = await getCurrentCustomer();
      if (!customer || !customer.customerId) return;

      setCustomer(customer);

      const { data } = await getUserLoyaltyCards(customer.customerId);
      setCards(data || []);

      // Load status for each card
      const statuses: Record<string, any> = {};
      for (const card of data || []) {
        const { data: status } = await getCardStatus(card.id);
        statuses[card.id] = status;
      }
      setCardStatuses(statuses);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const status = cardStatuses[item.id];
    const isFreeRedemption = status?.isFreeRedemption;

    return (
      <TouchableOpacity className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <Text className="text-lg font-bold">{item.businesses?.name}</Text>
        
        {/* Stamp Counter */}
        <View className="flex-row items-center justify-between my-3">
          <Text className="text-gray-600">Stamps: {item.stamp_count}</Text>
          <View className="flex-row gap-1">
            {Array.from({ length: item.stamp_count }).map((_, i) => (
              <View
                key={i}
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: '#FF6B6B' }}
              />
            ))}
          </View>
        </View>

        {/* FREE REDEMPTION STATUS */}
        {isFreeRedemption && (
          <View className="bg-green-100 p-3 rounded-lg mb-3 border border-green-300">
            <Text className="text-green-700 font-bold text-center">🎉 FREE REDEMPTION! 🎉</Text>
            <Text className="text-green-600 text-center text-sm mt-1">
              You've earned a free reward! Visit the store to redeem.
            </Text>
          </View>
        )}

        {/* Status Badge */}
        <View className="flex-row gap-2 justify-end">
          <View
            className={`px-3 py-1 rounded-full ${
              isFreeRedemption ? 'bg-green-200' : 'bg-blue-200'
            }`}
          >
            <Text className={isFreeRedemption ? 'text-green-700' : 'text-blue-700'}>
              {isFreeRedemption ? 'Ready to Redeem' : 'Active'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 p-4 bg-gray-50">
      <Text className="text-2xl font-bold mb-4">My Loyalty Cards</Text>

      {loading ? (
        <Text className="text-gray-500">Loading cards...</Text>
      ) : cards.length === 0 ? (
        <Text className="text-gray-500 text-center mt-8">
          No loyalty cards yet. Visit a store to create one!
        </Text>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}
```

---

## BUSINESS APP Implementation

### 1. Update Authentication Flow

#### `businessapp/lib/auth.ts`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== MERCHANT SIGN UP ==========
export const merchantSignUp = async (
  email: string,
  password: string,
  businessName: string,
  address?: string,
  latitude?: number,
  longitude?: number,
) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/merchant/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        businessName,
        address,
        latitude,
        longitude,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    // Store token and merchant data
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('merchantId', data.merchantId);
      await AsyncStorage.setItem('merchantData', JSON.stringify(data));
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== MERCHANT SIGN IN ==========
export const merchantSignIn = async (email: string, password: string) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/merchant/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    // Store token and merchant data
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('merchantId', data.merchant.id);
      await AsyncStorage.setItem('merchantData', JSON.stringify(data.merchant));
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== GET CURRENT MERCHANT ==========
export const getCurrentMerchant = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const merchantId = await AsyncStorage.getItem('merchantId');
    const merchantData = await AsyncStorage.getItem('merchantData');

    return {
      token,
      merchantId,
      merchant: merchantData ? JSON.parse(merchantData) : null,
    };
  } catch (error) {
    return null;
  }
};
```

### 2. Update Scanner Functions

#### `businessapp/lib/database.ts` - Scanner Operations
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// ========== RESOLVE CUSTOMER QR CODE (Core Scanner Operation) ==========
export const resolveCustomerQRCode = async (qrCodeValue: string) => {
  try {
    const headers = await getHeaders();
    const merchantId = await AsyncStorage.getItem('merchantId');

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/scanner/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        qrCodeValue,
        merchantId,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    return {
      success: true,
      card: data.loyaltyCard,
      customer: data.customer,
      stampSettings: data.stampSettings,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      card: null,
    };
  }
};

// ========== ADD STAMP ==========
export const addStampToCard = async (
  loyaltyCardId: string,
  customerId: string,
  quantity: number = 1,
  notes?: string,
) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/scanner/add-stamp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loyaltyCardId,
        customerId,
        quantity,
        notes,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    return {
      success: true,
      card: data.card,
      isRedemptionReached: data.isRedemptionReached,
      rewardCode: data.rewardCode,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      card: null,
    };
  }
};

// ========== REMOVE STAMP ==========
export const removeStampFromCard = async (
  loyaltyCardId: string,
  customerId: string,
  quantity: number = 1,
  notes?: string,
) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/scanner/remove-stamp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loyaltyCardId,
        customerId,
        quantity,
        notes,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    return {
      success: true,
      card: data.card,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      card: null,
    };
  }
};

// ========== PROCESS REDEMPTION ==========
export const processRedemption = async (
  loyaltyCardId: string,
  customerId: string,
  rewardCode: string,
) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/scanner/redeem`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loyaltyCardId,
        customerId,
        rewardCode,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    return {
      success: true,
      card: data.card,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ========== GET STAMP SETTINGS ==========
export const getStampSettings = async (merchantId: string) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/stamp-settings/${merchantId}`,
      { headers },
    );

    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ========== UPDATE STAMP SETTINGS ==========
export const updateStampSettings = async (
  merchantId: string,
  settings: {
    stampsPerRedemption?: number;
    redemptionRewardDescription?: string;
    promotionText?: string;
    promotionActive?: boolean;
  },
) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/stamp-settings/${merchantId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      },
    );

    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : data.message };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
```

### 3. Scanner UI Component

#### `businessapp/app/(tabs)/scan.tsx` - QR Code Scanner Screen
```typescript
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { resolveCustomerQRCode, addStampToCard } from '@/lib/database';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await CameraView.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);

    try {
      // Resolve QR code
      const result = await resolveCustomerQRCode(data);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Invalid QR code');
        setScanned(false);
        return;
      }

      setCurrentCard(result.card);
      setCustomer(result.customer);

      // Show options
      showStampOptions(result.card, result.customer);
    } catch (error) {
      Alert.alert('Error', error.message);
      setScanned(false);
    }
  };

  const showStampOptions = (card: any, customer: any) => {
    Alert.alert(
      `${customer.fullName}'s Card`,
      `Current stamps: ${card.stamp_count}`,
      [
        {
          text: 'Add Stamp',
          onPress: () => handleAddStamp(card, customer),
        },
        {
          text: 'Remove Stamp',
          onPress: () => handleRemoveStamp(card, customer),
        },
        {
          text: 'Cancel',
          onPress: () => setScanned(false),
          style: 'cancel',
        },
      ],
    );
  };

  const handleAddStamp = async (card: any, customer: any) => {
    try {
      const result = await addStampToCard(
        card.id,
        customer.id,
        1,
        'Stamp added via scanner',
      );

      if (result.success) {
        if (result.isRedemptionReached) {
          Alert.alert(
            '🎉 FREE REDEMPTION! 🎉',
            `${customer.fullName} has earned a free reward!\n\nReward Code: ${result.rewardCode}`,
            [{ text: 'OK', onPress: () => setScanned(false) }],
          );
        } else {
          Alert.alert(
            'Success',
            `Stamp added! Total stamps: ${result.card.stamp_count}`,
            [{ text: 'OK', onPress: () => setScanned(false) }],
          );
        }
      } else {
        Alert.alert('Error', result.error);
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setScanned(false);
    }
  };

  const handleRemoveStamp = async (card: any, customer: any) => {
    if (card.stamp_count === 0) {
      Alert.alert('Error', 'No stamps to remove');
      setScanned(false);
      return;
    }

    try {
      const result = await removeStampFromCard(
        card.id,
        customer.id,
        1,
        'Stamp removed via scanner',
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Stamp removed! Total stamps: ${result.card.stamp_count}`,
          [{ text: 'OK', onPress: () => setScanned(false) }],
        );
      } else {
        Alert.alert('Error', result.error);
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View className="flex-1">
      <CameraView
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr'],
        }}
        style={{ flex: 1 }}
      />

      {scanned && (
        <View className="absolute bottom-0 w-full bg-black bg-opacity-75 p-4">
          <TouchableOpacity
            className="bg-blue-500 p-4 rounded-lg"
            onPress={() => setScanned(false)}
          >
            <Text className="text-white text-center font-bold">Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
```

---

## Key Features Implemented

### Customer App
- ✅ Customer signup/signin with unique username
- ✅ Auto-generated QR code on signup
- ✅ View all loyalty cards
- ✅ See stamp count with visual indicators
- ✅ **FREE REDEMPTION badge** when card is ready
- ✅ View transaction history
- ✅ View redeemed rewards
- ✅ Location tracking for geofencing

### Business App
- ✅ Merchant signup/signin
- ✅ QR code scanner for customer cards
- ✅ Real-time stamp add/remove
- ✅ **Automatic FREE REDEMPTION status** when threshold reached
- ✅ Stamp settings configuration
- ✅ Transaction history
- ✅ Location management
- ✅ Nearby customers list

---

## Environment Variables

Add these to `.env.local` in both apps:
```
EXPO_PUBLIC_API_URL=http://your-backend-url
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```


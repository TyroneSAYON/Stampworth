import { supabase } from '@/lib/supabase';

// Send push notifications to all customers who have loyalty cards with this merchant
export const sendAnnouncementNotification = async (merchantId: string, title: string, body: string) => {
  // Get all customer IDs with loyalty cards at this merchant
  const { data: cards } = await supabase
    .from('loyalty_cards')
    .select('customer_id')
    .eq('merchant_id', merchantId);

  if (!cards || cards.length === 0) return { sent: 0 };

  const customerIds = [...new Set(cards.map((c: any) => c.customer_id))];

  // Get push tokens for these customers
  const { data: customers } = await supabase
    .from('customers')
    .select('push_token')
    .in('id', customerIds)
    .not('push_token', 'is', null);

  if (!customers || customers.length === 0) return { sent: 0 };

  const tokens = customers
    .map((c: any) => c.push_token)
    .filter((t: string) => t && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) return { sent: 0 };

  // Send via Expo Push API
  const messages = tokens.map((token: string) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { type: 'announcement', merchantId },
  }));

  // Expo allows up to 100 notifications per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let totalSent = 0;
  for (const chunk of chunks) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      if (response.ok) {
        totalSent += chunk.length;
      }
    } catch {
      // Continue sending remaining chunks
    }
  }

  return { sent: totalSent };
};

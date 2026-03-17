import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { CreateQRCodeDto } from './dto/create-qr-code.dto';

@Injectable()
export class QRCodesService {
  async createQRCode(createQRDto: CreateQRCodeDto) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          business_id: createQRDto.businessId,
          code_value: createQRDto.codeValue,
          code_image_url: createQRDto.codeImageUrl,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessQRCodes(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async validateQRCode(codeValue: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code_value', codeValue)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new NotFoundException('Invalid QR code');
      }

      // Update scan count
      await supabase
        .from('qr_codes')
        .update({
          times_scanned: (data.times_scanned || 0) + 1,
          last_scanned_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deactivateQRCode(qrCodeId: string) {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .update({ is_active: false })
        .eq('id', qrCodeId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async generateCustomerQRCode(userId: string, qrCodeValue: string, qrCodeImageUrl?: string) {
    try {
      const { data, error } = await supabase
        .from('customer_qr_codes')
        .insert({
          user_id: userId,
          qr_code_value: qrCodeValue,
          qr_code_image_url: qrCodeImageUrl,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getUserCustomerQRCodes(userId: string) {
    try {
      const { data, error } = await supabase
        .from('customer_qr_codes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

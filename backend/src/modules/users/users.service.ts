import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';

@Injectable()
export class UsersService {
  async getUserById(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw new NotFoundException('User not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getUserByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        throw new NotFoundException('User not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateUser(userId: string, updateData: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
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
}

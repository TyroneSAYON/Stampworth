import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Get('email/:email')
  getUserByEmail(@Param('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.updateUser(id, updateData);
  }
}

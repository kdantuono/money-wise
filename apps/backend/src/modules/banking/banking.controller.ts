import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BankingService } from './banking.service';

@ApiTags('banking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Get('connections')
  @ApiOperation({ summary: 'Get bank connections' })
  @ApiResponse({ status: 200, description: 'Bank connections retrieved successfully' })
  async getBankConnections(@Request() req) {
    return await this.bankingService.getBankConnections(req.user.id);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect a bank account' })
  @ApiResponse({ status: 201, description: 'Bank connected successfully' })
  async connectBank(@Request() req, @Body() bankData: any) {
    return await this.bankingService.connectBank(req.user.id, bankData);
  }

  @Post('sync/:connectionId')
  @ApiOperation({ summary: 'Sync transactions from bank' })
  @ApiResponse({ status: 200, description: 'Transactions synced successfully' })
  async syncTransactions(@Request() req, @Param('connectionId') connectionId: string) {
    return await this.bankingService.syncTransactions(req.user.id, connectionId);
  }

  @Delete('disconnect/:connectionId')
  @ApiOperation({ summary: 'Disconnect bank account' })
  @ApiResponse({ status: 200, description: 'Bank disconnected successfully' })
  async disconnectBank(@Request() req, @Param('connectionId') connectionId: string) {
    await this.bankingService.disconnectBank(req.user.id, connectionId);
    return { message: 'Bank disconnected successfully' };
  }
}
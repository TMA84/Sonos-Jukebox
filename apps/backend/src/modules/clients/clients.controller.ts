import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, UpdateClientSettingsDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Client, ClientSettings } from '@sonos-jukebox/shared';

@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(): Promise<Client[]> {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Client> {
    return this.clientsService.findOne(id);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string): Promise<ClientSettings> {
    return this.clientsService.getSettings(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateClientDto): Promise<Client> {
    return this.clientsService.update(id, dto);
  }

  @Put(':id/settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(@Param('id') id: string, @Body() dto: UpdateClientSettingsDto): Promise<ClientSettings> {
    return this.clientsService.updateSettings(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.clientsService.remove(id);
  }
}

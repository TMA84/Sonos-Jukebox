import { AppDataSource } from '../database/data-source';
import { Client } from '../database/entities/client.entity';
import { AppError } from '../middleware/error-handler';

export class ClientService {
  private clientRepository = AppDataSource.getRepository(Client);

  async createClient(id: string, name: string): Promise<Client> {
    const existing = await this.clientRepository.findOne({ where: { id } });
    if (existing) {
      throw new AppError(400, 'Client ID already exists');
    }

    const client = this.clientRepository.create({
      id,
      name,
      room: '',
      enableSpeakerSelection: true,
      isActive: true,
    });

    return await this.clientRepository.save(client);
  }

  async getClient(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new AppError(404, 'Client not found');
    }
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await this.clientRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const client = await this.getClient(id);
    Object.assign(client, updates);
    return await this.clientRepository.save(client);
  }

  async deleteClient(id: string): Promise<void> {
    const client = await this.getClient(id);
    await this.clientRepository.remove(client);
  }

  async updateSpeaker(clientId: string, room: string): Promise<Client> {
    return await this.updateClient(clientId, { room });
  }
}

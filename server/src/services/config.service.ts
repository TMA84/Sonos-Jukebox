import { AppDataSource } from '../database/data-source';
import { Config } from '../database/entities/config.entity';

export class ConfigService {
  private configRepository = AppDataSource.getRepository(Config);

  async get(key: string, defaultValue?: string): Promise<string | undefined> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config?.value || defaultValue;
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    await this.configRepository.save({
      key,
      value,
      description,
    });
  }

  async getAll(): Promise<Record<string, string>> {
    const configs = await this.configRepository.find();
    return configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async delete(key: string): Promise<void> {
    await this.configRepository.delete({ key });
  }

  async getSonosConfig() {
    const host = await this.get('sonos_api_host', process.env.SONOS_API_HOST || '127.0.0.1');
    const port = await this.get('sonos_api_port', process.env.SONOS_API_PORT || '5005');
    return { host, port };
  }

  async setSonosConfig(host: string, port: string): Promise<void> {
    await this.set('sonos_api_host', host, 'Sonos HTTP API host');
    await this.set('sonos_api_port', port, 'Sonos HTTP API port');
  }
}

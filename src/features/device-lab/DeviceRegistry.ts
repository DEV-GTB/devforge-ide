// Device Registry - Manages connected devices
import { Device, DeviceType, SerialConnection } from '../../types/device';

export class DeviceRegistry {
  private devices: Map<string, Device> = new Map();
  private connections: Map<string, SerialConnection> = new Map();

  async discoverDevices(): Promise<Device[]> {
    // In a real implementation, this would scan serial ports, network, etc.
    // For now, return mock devices
    const mockDevices: Device[] = [
      {
        id: 'esp32-1',
        type: 'esp32',
        name: 'ESP32 DevKit V1',
        connected: true,
        port: 'COM3',
        firmware: '2.1.0',
        state: {
          wifi: true,
          uptime: 532,
          cpu: 45,
          errors: [],
        },
        lastSeen: new Date(),
      },
    ];

    mockDevices.forEach(d => this.devices.set(d.id, d));
    return mockDevices;
  }

  getDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  getConnectedDevices(): Device[] {
    return this.getAllDevices().filter(d => d.connected);
  }

  async connect(deviceId: string, port: string, baudRate: number = 115200): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    const connection: SerialConnection = {
      port,
      baudRate,
      connected: true,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    };

    this.connections.set(deviceId, connection);
    device.connected = true;
    device.port = port;
  }

  async disconnect(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    this.connections.delete(deviceId);
    device.connected = false;
  }

  getConnection(deviceId: string): SerialConnection | undefined {
    return this.connections.get(deviceId);
  }

  async flashFirmware(deviceId: string, firmwarePath: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');
    if (!device.connected) throw new Error('Device not connected');

    // In a real implementation, this would use esptool or similar
    console.log(`Flashing ${firmwarePath} to ${device.name} on ${device.port}`);
  }

  async resetDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    // Send reset signal
    console.log(`Resetting ${device.name}`);
  }
}

// Device Types
export type DeviceType = 'esp32' | 'arduino' | 'raspberry-pi' | 'usb-serial' | 'ble' | 'network';

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  connected: boolean;
  port?: string;
  firmware?: string;
  ipAddress?: string;
  state: DeviceState;
  lastSeen: Date;
}

export interface DeviceState {
  wifi: boolean;
  uptime: number;
  cpu: number;
  errors: string[];
  gpio?: Record<string, GPIOState>;
  sensors?: Record<string, number>;
}

export interface GPIOState {
  mode: 'input' | 'output' | 'pwm';
  value: number;
}

export interface SerialConnection {
  port: string;
  baudRate: number;
  connected: boolean;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
}

export interface SerialMessage {
  timestamp: Date;
  data: string;
  direction: 'in' | 'out';
}

export interface FlashConfig {
  device: DeviceType;
  port: string;
  firmwarePath: string;
  baudRate: number;
  mode: 'qio' | 'qout' | 'dio' | 'dout';
}

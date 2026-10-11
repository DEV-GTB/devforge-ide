import { EventEmitter } from 'events';

export interface Device {
  id: string;
  name: string;
  type: 'ios' | 'android' | 'desktop' | 'mobile' | 'tablet';
  platform: string;
  osVersion: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  lastSeen: Date;
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  status: 'active' | 'idle' | 'completed';
  startTime: Date;
  endTime?: Date;
  actions: DeviceAction[];
}

export interface DeviceAction {
  type: 'tap' | 'swipe' | 'type' | 'screenshot' | 'navigate';
  timestamp: Date;
  details: any;
}

/**
 * Device Manager
 * Purpose: Manage connected devices for testing and preview
 * Features:
 * - Device registration
 * - Device health monitoring
 * - Session management
 * - Action recording
 * - Screenshot capture
 * - Device automation
 */
export class DeviceManager extends EventEmitter {
  private devices: Map<string, Device> = new Map();
  private sessions: Map<string, DeviceSession> = new Map();

  constructor() {
    super();
    this.startHealthCheck();
  }

  registerDevice(device: Omit<Device, 'id' | 'lastSeen'>): Device {
    const newDevice: Device = {
      ...device,
      id: this.generateId(),
      lastSeen: new Date(),
    };

    this.devices.set(newDevice.id, newDevice);
    this.emit('device.registered', newDevice);
    return newDevice;
  }

  unregisterDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.emit('device.unregistered', device);
    }
  }

  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  getDevicesByType(type: Device['type']): Device[] {
    return this.getAllDevices().filter(d => d.type === type);
  }

  getOnlineDevices(): Device[] {
    return this.getAllDevices().filter(d => d.status === 'online');
  }

  updateDeviceStatus(deviceId: string, status: Device['status']): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      device.lastSeen = new Date();
      this.emit('device.status_changed', device);
    }
  }

  createSession(deviceId: string): DeviceSession {
    const session: DeviceSession = {
      id: this.generateId(),
      deviceId,
      status: 'active',
      startTime: new Date(),
      actions: [],
    };

    this.sessions.set(session.id, session);
    this.emit('session.created', session);
    return session;
  }

  getSession(sessionId: string): DeviceSession | undefined {
    return this.sessions.get(sessionId);
  }

  getDeviceSessions(deviceId: string): DeviceSession[] {
    return Array.from(this.sessions.values()).filter(s => s.deviceId === deviceId);
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();
      this.emit('session.ended', session);
    }
  }

  recordAction(sessionId: string, action: DeviceAction): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.actions.push(action);
      this.emit('action.recorded', { sessionId, action });
    }
  }

  async captureScreenshot(deviceId: string): Promise<string> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // In a real implementation, this would use Appium, WebDriver, or similar
    // For now, return a mock base64 image
    this.emit('screenshot.captured', { deviceId, timestamp: new Date() });
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  async tap(deviceId: string, x: number, y: number): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // In a real implementation, this would send tap command to device
    this.emit('action.executed', { deviceId, type: 'tap', x, y });
  }

  async swipe(deviceId: string, startX: number, startY: number, endX: number, endY: number): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // In a real implementation, this would send swipe command to device
    this.emit('action.executed', { deviceId, type: 'swipe', startX, startY, endX, endY });
  }

  async type(deviceId: string, text: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // In a real implementation, this would send type command to device
    this.emit('action.executed', { deviceId, type: 'type', text });
  }

  async navigate(deviceId: string, url: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // In a real implementation, this would send navigate command to device
    this.emit('action.executed', { deviceId, type: 'navigate', url });
  }

  private startHealthCheck(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      this.devices.forEach((device, id) => {
        const lastSeen = device.lastSeen.getTime();
        if (now.getTime() - lastSeen > timeout && device.status === 'online') {
          this.updateDeviceStatus(id, 'offline');
        }
      });
    }, 60000); // Check every minute
  }

  private generateId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

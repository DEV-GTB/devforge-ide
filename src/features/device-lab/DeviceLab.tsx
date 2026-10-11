// Device Lab UI Component
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Device } from '../../types/device';
import { DeviceRegistry } from './DeviceRegistry';
import { Monitor, Zap, Settings, RefreshCw, Play, Cpu, Wifi, HardDrive } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { ParticleSystem } from '../../components/animations/ParticleSystem';
import { FadeIn } from '../../components/animations/FadeIn';

export function DeviceLab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const registry = new DeviceRegistry();
  const deviceInfo = useDeviceDetection();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsScanning(true);
    const discovered = await registry.discoverDevices();
    setDevices(discovered);
    setIsScanning(false);
  };

  const handleConnect = async (device: Device) => {
    if (!device.port) return;
    await registry.connect(device.id, device.port);
    setSelectedDevice(device);
    setSerialOutput(['Connected to ' + device.name]);
  };

  const handleDisconnect = async (deviceId: string) => {
    await registry.disconnect(deviceId);
    setSelectedDevice(null);
    setSerialOutput([]);
  };

  const handleFlash = async () => {
    if (!selectedDevice) return;
    console.log('Flash firmware for', selectedDevice.name);
  };

  const handleReset = async () => {
    if (!selectedDevice) return;
    await registry.resetDevice(selectedDevice.id);
    setSerialOutput((prev: string[]) => [...prev, 'Device reset']);
  };

  const isMobile = deviceInfo.isMobile || deviceInfo.isSmallMobile;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative overflow-hidden">
      <ParticleSystem count={30} color="#3b82f6" speed={0.5} className="opacity-30" />

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Device Lab</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadDevices}
            disabled={isScanning}
            className={`p-2 rounded-lg ${isScanning ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <AnimatePresence>
            {devices.map((device, index) => (
              <FadeIn key={device.id} delay={index * 0.05}>
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => !isMobile && setSelectedDevice(device)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedDevice?.id === device.id
                      ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20'
                      : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: device.connected ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.5, repeat: device.connected ? Infinity : 0 }}
                        className={`w-3 h-3 rounded-full ${device.connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'}`}
                      />
                      <span className="font-medium">{device.name}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                      {device.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {device.port && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <HardDrive className="w-4 h-4" />
                        {device.port}
                      </div>
                    )}
                    {device.state.wifi && device.ipAddress && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Wifi className="w-4 h-4" />
                        {device.ipAddress}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <Cpu className="w-4 h-4" />
                      {device.state.cpu}%
                    </div>
                  </div>

                  <div className={`flex gap-2 mt-4 ${isMobile ? 'flex-col' : ''}`}>
                    {device.connected ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); handleDisconnect(device.id); }}
                          className={`flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium ${isMobile ? 'w-full' : ''}`}
                        >
                          Disconnect
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); handleFlash(); }}
                          className={`flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium ${isMobile ? 'w-full' : ''}`}
                        >
                          Flash
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); handleReset(); }}
                          className={`flex-1 bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm font-medium ${isMobile ? 'w-full' : ''}`}
                        >
                          Reset
                        </motion.button>
                      </>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); handleConnect(device); }}
                        className={`flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm font-medium ${isMobile ? 'w-full' : ''}`}
                      >
                        Connect
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </AnimatePresence>
        </div>

        {devices.length === 0 && !isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 py-12"
          >
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No devices found</p>
            <p className="text-sm mt-2">Click the refresh button to scan for devices</p>
          </motion.div>
        )}
      </div>

      {/* Serial Monitor */}
      <AnimatePresence>
        {selectedDevice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700 p-4 bg-gray-900/80 backdrop-blur-sm relative z-10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Serial Monitor - {selectedDevice.name}
              </div>
              <button
                onClick={() => setSerialOutput([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs border border-gray-700">
              {serialOutput.map((line: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-green-400 mb-1"
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

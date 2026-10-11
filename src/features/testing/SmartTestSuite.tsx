import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle, FileCode, Bug, Zap } from 'lucide-react';
import { FadeIn, StaggerContainer } from '../../components/animations';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

export interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  error?: string;
  coverage?: number;
}

export function SmartTestSuite() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const deviceInfo = useDeviceDetection();

  const generateTests = () => {
    const newTests: TestResult[] = [
      { id: '1', name: 'Component Rendering', status: 'pending', duration: 0 },
      { id: '2', name: 'User Interactions', status: 'pending', duration: 0 },
      { id: '3', name: 'API Integration', status: 'pending', duration: 0 },
      { id: '4', name: 'Error Handling', status: 'pending', duration: 0 },
      { id: '5', name: 'Performance', status: 'pending', duration: 0 },
      { id: '6', name: 'Accessibility', status: 'pending', duration: 0 },
    ];
    setTests(newTests);
  };

  useEffect(() => {
    generateTests();
  }, []);

  const runTests = async () => {
    setIsRunning(true);

    for (let i = 0; i < tests.length; i++) {
      setTests(prev => prev.map((t, idx) =>
        idx === i ? { ...t, status: 'running' as const } : t
      ));

      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      const passed = Math.random() > 0.2; // 80% pass rate
      const duration = Math.floor(Math.random() * 500) + 100;

      setTests(prev => prev.map((t, idx) =>
        idx === i
          ? {
              ...t,
              status: passed ? 'passed' : 'failed',
              duration,
              error: passed ? undefined : 'Assertion failed: expected true to be false',
              coverage: Math.floor(Math.random() * 30) + 70,
            }
          : t
      ));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-700';
      case 'running':
        return 'bg-yellow-900/30 border-yellow-500';
      case 'passed':
        return 'bg-green-900/30 border-green-500';
      case 'failed':
        return 'bg-red-900/30 border-red-500';
    }
  };

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;
  const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
  const avgCoverage = tests.reduce((sum, t) => sum + (t.coverage || 0), 0) / tests.length;

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bug className="w-5 h-5 text-purple-400" />
          Smart Test Suite
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={runTests}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isRunning ? 'bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running...' : 'Run All'}
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{tests.length}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{passedCount}</div>
          <div className="text-xs text-gray-400">Passed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{failedCount}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{avgCoverage.toFixed(0)}%</div>
          <div className="text-xs text-gray-400">Coverage</div>
        </div>
      </div>

      {/* Test List */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 200px)' }}>
        <StaggerContainer className="space-y-2">
        {tests.map((test) => (
          <FadeIn key={test.id}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedTest(test.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {test.duration > 0 && <span>{test.duration}ms</span>}
                  {test.coverage && <span>{test.coverage}% cov</span>}
                </div>
              </div>
              {test.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{test.error}</span>
                </motion.div>
              )}
            </motion.div>
          </FadeIn>
        ))}
        </StaggerContainer>
      </div>

      {/* Selected Test Details */}
      <AnimatePresence>
        {selectedTest && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Test Details</h3>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="text-sm text-gray-400">
              <p>Test: {tests.find(t => t.id === selectedTest)?.name}</p>
              <p>Status: {tests.find(t => t.id === selectedTest)?.status}</p>
              <p>Duration: {tests.find(t => t.id === selectedTest)?.duration}ms</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

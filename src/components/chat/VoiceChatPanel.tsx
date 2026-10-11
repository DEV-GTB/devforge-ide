import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Send, Sparkles } from 'lucide-react';
import { localStorageManager } from '../../core/LocalStorageManager';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode?: 'ask' | 'plan' | 'code';
  audioUrl?: string;
}

interface VoiceChatPanelProps {
  mode: 'ask' | 'plan' | 'code';
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  mode,
  onSendMessage,
  isLoading = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await localStorageManager.getChatHistory(50);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    try {
      await localStorageManager.saveChatMessage(message);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      mode,
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveMessage(userMessage);
    setInput('');
    onSendMessage(input);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Convert to base64 for API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          // Send to the server-side speech-to-text endpoint.
          // The server selects the model; the client never specifies one.
          try {
            const response = await fetch('/api/ai/speech-to-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Audio,
              }),
            });

            const { transcript } = await response.json();

            if (transcript) {
              setInput(transcript);
            }
          } catch (error) {
            console.error('Speech recognition failed:', error);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      let seconds = 0;
      recordingIntervalRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playTTS = async (text: string, messageId: string) => {
    try {
      setIsPlaying(messageId);

      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: {
            model: 'elevenlabs/eleven-v3',
            voiceId: 'JBFqnCBsd6RMkjVDRZzb',
            outputFormat: 'mp3_44100_128',
          },
        }),
      });

      const { audioUrl } = await response.json();

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(null);
        audio.play();
      }
    } catch (error) {
      console.error('TTS failed:', error);
      setIsPlaying(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.mode && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30">
                      {message.mode.toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {message.role === 'assistant' && (
                  <button
                    onClick={() => playTTS(message.content, message.id)}
                    className="mt-2 flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {isPlaying === message.id ? (
                      <Volume2 className="w-4 h-4 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span>Read aloud</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-2">
          {/* Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Recording Timer */}
          {isRecording && (
            <span className="text-red-400 text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          )}

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message or use voice..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

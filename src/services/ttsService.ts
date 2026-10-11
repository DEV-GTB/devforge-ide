// Text-to-Speech Service
export type TTSProvider = 'browser' | 'elevenlabs' | 'coqui';

export interface TTSConfig {
  provider: TTSProvider;
  apiKey?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export class TTSService {
  private config: TTSConfig;
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(config: TTSConfig) {
    this.config = config;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synthesis) return;

    const load = () => {
      this.voices = this.synthesis!.getVoices();
    };

    load();
    this.synthesis.onvoiceschanged = load;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  async speak(text: string, options?: { voice?: string; rate?: number; pitch?: number }): Promise<void> {
    switch (this.config.provider) {
      case 'browser':
        return this.speakBrowser(text, options);
      case 'elevenlabs':
        return this.speakElevenLabs(text, options);
      case 'coqui':
        return this.speakCoqui(text, options);
      default:
        throw new Error(`Unsupported TTS provider: ${this.config.provider}`);
    }
  }

  private async speakBrowser(text: string, options?: { voice?: string; rate?: number; pitch?: number }): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      const voiceName = options?.voice || this.config.voice;
      if (voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) utterance.voice = voice;
      }

      utterance.rate = options?.rate ?? this.config.rate ?? 1;
      utterance.pitch = options?.pitch ?? this.config.pitch ?? 1;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      this.synthesis.speak(utterance);
    });
  }

  private async speakElevenLabs(text: string, options?: { voice?: string }): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key required');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${options?.voice || '21m00Tcm4TlvDq8ikWAM'}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = await audioContext.decodeAudioData(audioBuffer);
    audioSource.connect(audioContext.destination);
    audioSource.start();

    return new Promise((resolve) => {
      audioSource.onended = () => resolve();
    });
  }

  private async speakCoqui(text: string, options?: { voice?: string }): Promise<void> {
    // Coqui TTS requires local server - this is a placeholder
    // For production, you would set up a local Coqui TTS server
    console.log('Coqui TTS requires local server setup');
    throw new Error('Coqui TTS requires local server - please use browser TTS or ElevenLabs');
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    if (!this.synthesis) return false;
    return this.synthesis.speaking;
  }
}

import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { processAudioInput, createBlob, decode, decodeAudioData } from '../utils/audio';
import { Transaction, TransactionType, Goal } from '../types';

export interface LiveServiceCallbacks {
  onStatusChange: (status: string) => void;
  onTransactionAdd: (type: TransactionType, amount: number, date: string, description: string, category: string) => void;
  onNavigate: (view: 'HOME' | 'EXTRACT' | 'CALENDAR' | 'CHARTS') => void;
  onLogout: () => void;
  onError: (error: string) => void;
  onAudioLevel: (source: 'user' | 'ai', level: number) => void;
}

let session: any = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let stream: MediaStream | null = null;
let nextStartTime = 0;
const activeSources = new Set<AudioBufferSourceNode>();

let inputAnalyser: AnalyserNode | null = null;
let outputAnalyser: AnalyserNode | null = null;
let volumeInterval: any = null;

const transactionTool: FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Registra uma transação financeira. Identifique se é RECEITA, DESPESA, RESERVA (poupança/emergência) ou INVESTIMENTO (ações/cripto/renda variável).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['RECEITA', 'DESPESA', 'RESERVA', 'INVESTIMENTO'] },
      amount: { type: Type.NUMBER },
      date: { type: Type.STRING, description: 'ISO YYYY-MM-DD. Hoje se não especificado.' },
      description: { type: Type.STRING },
      category: { type: Type.STRING },
    },
    required: ['type', 'amount', 'date', 'description', 'category'],
  },
};

const navigationTool: FunctionDeclaration = {
  name: 'navigate',
  description: 'Muda a tela do app.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      view: { type: Type.STRING, enum: ['HOME', 'EXTRACT', 'CALENDAR', 'CHARTS'] }
    },
    required: ['view']
  }
};

const closeSessionTool: FunctionDeclaration = {
  name: 'closeSession',
  description: 'Encerrar sessão.',
  parameters: { type: Type.OBJECT, properties: {}, },
};

// Toca um buffer silencioso para desbloquear o áudio no iOS/Android
const unlockAudioContext = (ctx: AudioContext) => {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
};

const playTone = (ctx: AudioContext, type: 'start' | 'success' | 'process') => {
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        
        if (type === 'start') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'process') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'success') {
            const frequencies = [523.25, 659.25, 783.99];
            frequencies.forEach((freq, i) => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(freq, now + i * 0.05);
                gain2.gain.setValueAtTime(0.05, now + i * 0.05);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
                osc2.start(now + i * 0.05);
                osc2.stop(now + 0.6 + i * 0.05);
            });
        }
    } catch(e) {}
};

export const connectLiveSession = async (
    userName: string, 
    transactions: Transaction[],
    goal: Goal | null,
    callbacks: LiveServiceCallbacks
) => {
  try {
    // 1. Validar API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key não encontrada.");

    callbacks.onStatusChange('connecting');

    // 2. Inicializar Áudio (Sincronamente para manter User Gesture)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    // Reutilizar contextos se existirem
    if (!inputAudioContext) inputAudioContext = new AudioContextClass();
    if (!outputAudioContext) outputAudioContext = new AudioContextClass();

    // 3. Forçar Resume e Unlock IMEDIATAMENTE (Vital para Mobile/Safari)
    try {
        if (outputAudioContext.state === 'suspended') {
            await outputAudioContext.resume();
            unlockAudioContext(outputAudioContext);
        }
        if (inputAudioContext.state === 'suspended') {
            await inputAudioContext.resume();
        }
    } catch (e) {
        console.warn("Audio resume warning:", e);
    }

    // Configurar Analisadores
    outputAnalyser = outputAudioContext.createAnalyser();
    outputAnalyser.fftSize = 256;
    outputAnalyser.smoothingTimeConstant = 0.5;
    
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAnalyser);
    outputAnalyser.connect(outputAudioContext.destination);
    
    // Reseta o timer de áudio
    nextStartTime = outputAudioContext.currentTime + 0.1;

    // 4. Solicitar Microfone (Tratamento específico de erro de permissão)
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
            } 
        });
    } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            throw new Error("Acesso ao microfone negado. Por favor, permita o acesso nas configurações do navegador.");
        } else if (e.name === 'NotFoundError') {
            throw new Error("Nenhum microfone encontrado.");
        }
        throw new Error("Erro ao acessar microfone: " + e.message);
    }

    // 5. Conectar com Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const balance = transactions
        .filter(t => new Date(t.date).getMonth() === currentMonth)
        .reduce((acc, t) => t.type === 'RECEITA' ? acc + t.amount : t.type === 'DESPESA' || t.type === 'RESERVA' || t.type === 'INVESTIMENTO' ? acc - t.amount : acc, 0);
    
    const financialContext = `Saldo atual disponível (descontando reservas e investimentos): R$ ${balance.toFixed(2)}.`;

    // Loop de Volume (Visualização)
    if (volumeInterval) clearInterval(volumeInterval);
    volumeInterval = setInterval(() => {
        if (!inputAnalyser || !outputAnalyser) return;
        
        const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
        inputAnalyser.getByteFrequencyData(inputData);
        const inputLevel = (inputData.reduce((a, b) => a + b) / inputData.length) / 255;

        const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
        outputAnalyser.getByteFrequencyData(outputData);
        const outputLevel = (outputData.reduce((a, b) => a + b) / outputData.length) / 255;

        if (outputLevel > 0.01) callbacks.onAudioLevel('ai', outputLevel * 3.0); 
        else callbacks.onAudioLevel('user', inputLevel * 2.5);
    }, 50);

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: async () => {
          callbacks.onStatusChange('connected');
          if (outputAudioContext) playTone(outputAudioContext, 'start');
          
          if (!inputAudioContext || !stream) return;

          inputAnalyser = inputAudioContext.createAnalyser();
          inputAnalyser.fftSize = 256;
          
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          source.connect(inputAnalyser); 
          inputAnalyser.connect(scriptProcessor); 

          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Interrupção Inteligente (Barge-in)
            // Se o usuário falar alto, paramos o áudio da IA imediatamente.
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            
            if (rms > 0.15 && activeSources.size > 0) {
                 // Corta o áudio da IA
                 activeSources.forEach(s => { try { s.stop(); } catch(e){} });
                 activeSources.clear();
                 // Reseta o cursor de tempo
                 if(outputAudioContext) nextStartTime = outputAudioContext.currentTime + 0.05;
                 
                 // Avisa a IA que houve interrupção (opcional, ou apenas mandamos o novo áudio)
                 // sessionPromise.then(s => s.sendRealtimeInput({ content: { role: 'user', parts: [{ text: "." }] } }));
            }

            // Processamento de áudio padrão
            const base64PCM = processAudioInput(inputData, inputAudioContext!.sampleRate, 16000);
            
            if (base64PCM) {
                const pcmBlob = createBlob(base64PCM);
                sessionPromise.then((s) => { try { s.sendRealtimeInput({ media: pcmBlob }); } catch (e) {} });
            }
          };

          scriptProcessor.connect(inputAudioContext.destination);

          // "Wake word" para iniciar a conversa
          setTimeout(() => {
              sessionPromise.then((s) => {
                s.sendRealtimeInput({
                    content: { role: "user", parts: [{ text: "SISTEMA: O usuário conectou. Dê a saudação inicial curta e amigável, perguntando se há novas receitas, despesas ou investimentos." }] }
                });
              });
          }, 500);
        },
        
        onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
                if (outputAudioContext) playTone(outputAudioContext, 'process');
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'addTransaction') {
                        const args = fc.args as any;
                        if (outputAudioContext) playTone(outputAudioContext, 'success');
                        callbacks.onTransactionAdd(args.type as TransactionType, args.amount, args.date, args.description, args.category || 'Geral');
                        sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } }));
                    } else if (fc.name === 'navigate') {
                        const args = fc.args as any;
                        callbacks.onNavigate(args.view);
                        sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } }));
                    } else if (fc.name === 'closeSession') {
                        disconnectLiveSession();
                        callbacks.onLogout(); 
                    }
                }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext) {
                try {
                    // Decodifica PCM raw do Gemini (24kHz)
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    
                    const now = outputAudioContext.currentTime;
                    // Se o buffer estiver muito atrasado, pule para o "agora" para evitar latência acumulada
                    if (nextStartTime < now) nextStartTime = now + 0.05; 
                    
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    source.start(nextStartTime);
                    
                    nextStartTime += audioBuffer.duration;
                    activeSources.add(source);
                    source.onended = () => activeSources.delete(source);
                } catch(e) { console.error("Erro áudio:", e); }
            }
        },
        onclose: () => { callbacks.onStatusChange('disconnected'); },
        onerror: (err: any) => { 
            console.error("Gemini Error:", err);
            
            // Tratamento de erros específicos da API
            let errorMsg = "Erro na conexão com IA.";
            const errorString = err.toString().toLowerCase();

            if (errorString.includes("403") || errorString.includes("permission denied")) {
                errorMsg = "Acesso negado (403). Verifique a API Key e se a API 'Gemini API' está ativada no Google Cloud.";
            } else if (errorString.includes("401")) {
                errorMsg = "Não autorizado (401). Chave API inválida.";
            } else if (errorString.includes("quota")) {
                errorMsg = "Cota excedida. Tente novamente mais tarde.";
            }

            callbacks.onError(errorMsg);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: `Você é o Finança Voice. Fale pt-BR. Hoje: ${now.toLocaleDateString('pt-BR')}. ${financialContext}. Diferencie 'Reserva' (segurança) de 'Investimento' (multiplicação). Respostas curtas.`,
        tools: [{ functionDeclarations: [transactionTool, navigationTool, closeSessionTool] }]
      }
    });
    session = await sessionPromise;
  } catch (error: any) {
    console.error("Connection Critical Error:", error);
    callbacks.onStatusChange('error');
    // Passar a mensagem exata para a UI
    callbacks.onError(error.message || "Falha crítica ao conectar.");
  }
};

export const disconnectLiveSession = () => {
  if (volumeInterval) clearInterval(volumeInterval);
  volumeInterval = null;
  
  if (session) { 
      try { session.close(); } catch(e) {} 
      session = null; 
  }
  
  if (stream) { 
      stream.getTracks().forEach(track => track.stop()); 
      stream = null; 
  }

  activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
  activeSources.clear();
  nextStartTime = 0;
  
  // Apenas suspender, não fechar, para permitir reuso rápido
  if (inputAudioContext) try { inputAudioContext.suspend(); } catch(e) {}
  if (outputAudioContext) try { outputAudioContext.suspend(); } catch(e) {}
};
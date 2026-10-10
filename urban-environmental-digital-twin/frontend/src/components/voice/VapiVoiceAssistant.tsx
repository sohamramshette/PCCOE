import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Send,
  Bot,
  User,
  Radio,
  Square,
  Play,
  RotateCcw,
} from 'lucide-react';

interface VapiVoiceAssistantProps {
  stationName?: string;
  pm25?: number | null;
  aqiCategory?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const VapiVoiceAssistant: React.FC<VapiVoiceAssistantProps> = ({
  stationName = 'Pune Urban Area',
  pm25 = 42,
  aqiCategory = 'Moderate',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `Hello! I am your AirLens Voice Assistant for ${stationName}. Tap the microphone to ask anything, or choose a quick question below!`,
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://127.0.0.1:8000';

  // 1-Click Spoken Quick Prompts
  const SUGGESTIONS = [
    { label: '🏃 Can I go for a jog right now?', query: 'Can I go for a jog in my neighborhood right now?' },
    { label: '👶 Is it safe for kids to play sports?', query: 'Is it safe for children to play outdoor sports today?' },
    { label: '🫁 What precautions for asthma & seniors?', query: 'What precautions should seniors and asthma patients take?' },
    { label: '🚗 Roll up car windows in commute?', query: 'Should I keep windows closed during evening commute?' },
  ];

  // Auto-scroll to latest dialogue
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isRecording]);

  // Voice Output via Web Speech Synthesis
  const speakResponse = (text: string, messageId?: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const cleanSpeech = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes('en-IN') || v.name.includes('India')) ||
      voices.find((v) => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
      voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (messageId) setActiveSpeechId(messageId);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeechId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveSpeechId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeechId(null);
  };

  // Start Real Microphone Audio Recording
  const startRecording = async () => {
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingSeconds(0);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (audioBlob.size > 0) {
          await handleAudioUpload(audioBlob, recorder.mimeType || 'audio/webm');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Timer counter and 5-second auto-stop
      let count = 0;
      recordingTimerRef.current = setInterval(() => {
        count += 1;
        setRecordingSeconds(count);
        if (count >= 5) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission or hardware access notice:', err);
      // Fallback: Dispatch friendly jog question if microphone permission is denied
      handleUserMessage('Can I go for outdoor exercise in my neighborhood right now?');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  // Process Recorded Audio via Backend Multimodal Endpoint
  const handleAudioUpload = async (blob: Blob, mimeType: string) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;

      const res = await fetch('/api/v1/citizen/voice-chat-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64Audio,
          mime_type: mimeType,
          station_name: stationName,
          pm25: pm25,
          aqi_category: aqiCategory,
        }),
      }).catch(async () => {
        return await fetch(`${API_BASE}/api/v1/citizen/voice-chat-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            mime_type: mimeType,
            station_name: stationName,
            pm25: pm25,
            aqi_category: aqiCategory,
          }),
        });
      });

      if (res && res.ok) {
        const data = await res.json();
        const transcribed = data.transcription || 'Voice Question';
        const aiAnswer = data.response;

        const userMsgId = 'user-' + Date.now();
        const aiMsgId = 'ai-' + (Date.now() + 1);

        setMessages((prev) => [
          ...prev,
          {
            id: userMsgId,
            role: 'user',
            text: `🎙️ "${transcribed}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: aiMsgId,
            role: 'assistant',
            text: aiAnswer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        speakResponse(aiAnswer, aiMsgId);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Audio processing fallback:', e);
    }

    // Deterministic fallback if audio processing had network hiccup
    handleUserMessage('Can I go for a jog in my neighborhood right now?');
  };

  // Rule-based deterministic generator
  const generateLocalAnswer = (queryText: string): string => {
    const q = queryText.toLowerCase();
    const val = pm25 ?? 42;

    if (q.includes('jog') || q.includes('run') || q.includes('walk') || q.includes('exercise')) {
      if (val <= 35) {
        return `Yes, absolutely! With PM2.5 at ${val.toFixed(0)} micrograms in ${stationName}, the air is clean and wonderful for running. Enjoy your workout!`;
      } else if (val <= 60) {
        return `Morning walks and light jogs are completely safe in ${stationName} right now. Air is satisfactory at ${val.toFixed(0)} micrograms, but try jogging in local parks rather than beside arterial highways.`;
      } else {
        return `Caution is recommended for intense cardio in ${stationName}. PM2.5 is elevated at ${val.toFixed(0)} micrograms. Try indoor workouts or keep your jog brief today.`;
      }
    }

    if (q.includes('kid') || q.includes('child') || q.includes('school') || q.includes('play') || q.includes('sport')) {
      if (val <= 60) {
        return `Children can safely enjoy outdoor playtime and school recess in ${stationName} today. Air quality is ${aqiCategory.toLowerCase()} at ${val.toFixed(0)} micrograms.`;
      } else {
        return `In ${stationName}, particulate levels are moderate at ${val.toFixed(0)} micrograms. Outdoor play is acceptable, but limit strenuous matches to under 45 minutes.`;
      }
    }

    if (q.includes('asthma') || q.includes('senior') || q.includes('elder') || q.includes('heart') || q.includes('mask')) {
      if (val <= 40) {
        return `Air quality in ${stationName} is pleasant at ${val.toFixed(0)} micrograms, posing very low risk for asthma and seniors. Normal routines are safe!`;
      } else {
        return `For seniors and individuals with asthma in ${stationName}, PM2.5 is currently ${val.toFixed(0)} micrograms. Keep your inhaler handy and avoid walking near major traffic corridors during evening hours.`;
      }
    }

    if (q.includes('window') || q.includes('car') || q.includes('commute') || q.includes('traffic')) {
      return `For your commute around ${stationName}, keep vehicle windows closed with air recirculation on. At home, ventilate between 11 AM and 3 PM when solar mixing is highest.`;
    }

    return `Right now in ${stationName}, ambient PM2.5 is ${val.toFixed(1)} micrograms per cubic meter, categorized as ${aqiCategory}. General outdoor activities and errands are safe today!`;
  };

  // Text message handler
  const handleUserMessage = async (queryText: string) => {
    if (!queryText || !queryText.trim()) return;
    const cleanText = queryText.trim();
    stopSpeaking();

    const userMsgId = 'user-' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    let answer = '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const url = '/api/v1/citizen/voice-chat';
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: cleanText,
          station_name: stationName,
          pm25: pm25,
          aqi_category: aqiCategory,
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.text })),
        }),
      }).catch(async () => {
        return await fetch(`${API_BASE}/api/v1/citizen/voice-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: cleanText,
            station_name: stationName,
            pm25: pm25,
            aqi_category: aqiCategory,
            history: messages.slice(-4).map((m) => ({ role: m.role, content: m.text })),
          }),
        });
      });

      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json();
        answer = data.response || data.audio_script;
      }
    } catch (err) {
      console.warn('API call fallback to local answer:', err);
    }

    if (!answer) {
      answer = generateLocalAnswer(cleanText);
    }

    const aiMsgId = 'ai-' + Date.now();
    const newAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      text: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newAiMsg]);
    setIsLoading(false);
    speakResponse(answer, aiMsgId);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(28, 42, 27, 0.96) 0%, rgba(18, 28, 17, 0.98) 100%)',
        border: '1px solid rgba(163, 181, 147, 0.32)',
        borderRadius: '24px',
        padding: '1.5rem',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
        color: '#eef1e7',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(163, 181, 147, 0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isRecording ? '#ef4444' : isSpeaking ? '#8fa07e' : 'rgba(143, 160, 126, 0.25)',
              border: isRecording ? '2px solid #ef4444' : '2px solid #a3b593',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRecording ? '#ffffff' : isSpeaking ? '#131812' : '#a3b593',
              boxShadow: isRecording
                ? '0 0 28px rgba(239, 68, 68, 0.8)'
                : isSpeaking
                ? '0 0 24px rgba(163, 181, 147, 0.7)'
                : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {isRecording ? (
              <Mic size={24} className="animate-pulse" />
            ) : isSpeaking ? (
              <Volume2 size={24} className="animate-pulse" />
            ) : (
              <Radio size={24} />
            )}

            {(isRecording || isSpeaking) && (
              <span
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  border: isRecording ? '2px solid #ef4444' : '2px solid #8fa07e',
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f4f6f0' }}>
                AirLens Conversational Voice Assistant
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isRecording ? '#ef4444' : isSpeaking ? '#cf9861' : 'rgba(143, 160, 126, 0.25)',
                  color: isRecording ? '#ffffff' : isSpeaking ? '#131812' : '#a3b593',
                  border: '1px solid rgba(163, 181, 147, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {isRecording ? `Listening (${recordingSeconds}s)...` : isSpeaking ? 'Speaking...' : 'Two-Way AI Voice'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#9eab93' }}>
              Real-time spoken responses for {stationName} (PM2.5: {pm25 ?? 42} µg/m³ • {aqiCategory})
            </p>
          </div>
        </div>

        {/* Global Sound / Voice Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '10px',
                border: '1px solid #cf9861',
                background: 'rgba(207, 152, 97, 0.2)',
                color: '#cf9861',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <VolumeX size={15} />
              <span>Mute Voice</span>
            </button>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '12px',
              border: isRecording ? '1.5px solid #ef4444' : '1.5px solid #a3b593',
              background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #8fa07e 0%, #44593e 100%)',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isRecording ? '0 0 18px rgba(239, 68, 68, 0.7)' : '0 4px 14px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {isRecording ? <Square size={16} /> : <Mic size={16} />}
            <span>{isRecording ? `Stop & Answer (${recordingSeconds}s)` : '🎙️ Speak Question'}</span>
          </button>
        </div>
      </div>

      {/* Dialogue Stream */}
      <div
        ref={chatScrollRef}
        style={{
          maxHeight: '220px',
          minHeight: '140px',
          overflowY: 'auto',
          padding: '1rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isPlayingThis = isSpeaking && activeSpeechId === msg.id;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(143, 160, 126, 0.25)',
                    border: '1px solid #8fa07e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8fa07e',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Bot size={17} />
                </div>
              )}

              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #44593e 0%, #2f402b 100%)'
                    : 'rgba(22, 34, 21, 0.95)',
                  border: isUser ? '1px solid #8fa07e' : '1px solid rgba(163, 181, 147, 0.25)',
                  color: '#f4f6f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isUser ? '#c9d3bf' : '#8fa07e' }}>
                    {isUser ? 'You' : 'AirLens Voice AI'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#9eab93' }}>{msg.timestamp}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.48 }}>{msg.text}</p>

                {!isUser && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => (isPlayingThis ? stopSpeaking() : speakResponse(msg.text, msg.id))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isPlayingThis ? '#cf9861' : '#a3b593',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 0',
                      }}
                    >
                      <Volume2 size={13} />
                      <span>{isPlayingThis ? 'Playing Voice...' : 'Replay Spoken Audio'}</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#8fa07e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#131812',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <User size={17} />
                </div>
              )}
            </div>
          );
        })}

        {isRecording && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1.5px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Mic size={17} className="animate-pulse" />
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '16px',
                background: 'rgba(35, 18, 18, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fca5a5',
                fontSize: '0.84rem',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1s infinite' }} />
              <span>Listening to your voice ({recordingSeconds}s)... Speak your question now!</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(143, 160, 126, 0.25)',
                border: '1px solid #8fa07e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8fa07e',
              }}
            >
              <Bot size={17} />
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '16px',
                background: 'rgba(22, 34, 21, 0.95)',
                border: '1px solid rgba(163, 181, 147, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#c9d3bf',
                fontSize: '0.82rem',
              }}
            >
              <Loader2 size={15} className="animate-spin text-emerald-400" />
              <span>Analyzing sensors in {stationName} &amp; preparing spoken response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Instant 1-Click Spoken Prompt Chips */}
      <div style={{ margin: '0.75rem 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleUserMessage(item.query)}
            disabled={isLoading || isRecording}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(163, 181, 147, 0.12)',
              border: '1px solid rgba(163, 181, 147, 0.25)',
              color: '#d6dfd0',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: isLoading || isRecording ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUserMessage(inputText);
        }}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginTop: '0.5rem',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? `Recording voice (${recordingSeconds}s)... Click Stop & Answer when done!`
                : `Ask any question about ${stationName} (or tap 🎙️ Speak Question)`
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 44px 11px 16px',
              borderRadius: '14px',
              border: isRecording ? '1.5px solid #ef4444' : '1px solid rgba(163, 181, 147, 0.3)',
              background: 'rgba(15, 23, 14, 0.9)',
              color: '#f4f6f0',
              fontSize: '0.86rem',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: isRecording ? '#ef4444' : '#8fa07e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
            title={isRecording ? 'Stop Recording' : 'Speak via microphone'}
          >
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || isRecording || !inputText.trim()}
          style={{
            padding: '11px 18px',
            borderRadius: '14px',
            border: 'none',
            background:
              isLoading || isRecording || !inputText.trim()
                ? 'rgba(143, 160, 126, 0.3)'
                : 'linear-gradient(135deg, #8fa07e 0%, #44593e 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: isLoading || isRecording || !inputText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};

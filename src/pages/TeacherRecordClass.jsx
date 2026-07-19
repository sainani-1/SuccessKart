import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Monitor, Camera, Video, Square, Download, RotateCcw, Circle, Settings, CheckCircle2, AlertCircle, Clock, Trash2, AudioLines, Volume2, VolumeX, Headphones, ShieldCheck } from 'lucide-react';

const RECORD_MODES = [
  { id: 'mic', label: 'Voice Only', icon: Mic, description: 'Record audio from your microphone', color: 'from-green-500 to-emerald-600', hasMic: true, hasScreen: false, hasCamera: false },
  { id: 'screen', label: 'Screen Only', icon: Monitor, description: 'Record your screen display', color: 'from-blue-500 to-indigo-600', hasMic: false, hasScreen: true, hasCamera: false },
  { id: 'camera', label: 'Camera Only', icon: Camera, description: 'Record from your webcam', color: 'from-purple-500 to-pink-600', hasMic: false, hasScreen: false, hasCamera: true },
  { id: 'mic+screen', label: 'Voice + Screen', icon: Video, description: 'Record microphone audio along with screen', color: 'from-orange-500 to-red-600', hasMic: true, hasScreen: true, hasCamera: false },
  { id: 'mic+camera', label: 'Voice + Camera', icon: Video, description: 'Record microphone audio along with webcam', color: 'from-teal-500 to-cyan-600', hasMic: true, hasScreen: false, hasCamera: true },
  { id: 'screen+camera', label: 'Screen + Camera', icon: Video, description: 'Record screen with webcam overlay', color: 'from-rose-500 to-pink-600', hasMic: false, hasScreen: true, hasCamera: true },
  { id: 'all', label: 'Voice + Screen + Camera', icon: Video, description: 'Record everything: mic, screen, and webcam', color: 'from-yellow-500 to-amber-600', hasMic: true, hasScreen: true, hasCamera: true },
];

const VOICE_EFFECTS = [
  { id: 'normal', label: 'Normal', icon: Volume2, description: 'No voice change' },
  { id: 'deep', label: 'Deep Voice', icon: AudioLines, description: 'Low deep voice' },
  { id: 'high', label: 'High Pitch', icon: Mic, description: 'High pitch voice' },
  { id: 'robot', label: 'Robot', icon: Settings, description: 'Robotic voice' },
  { id: 'echo', label: 'Echo', icon: AudioLines, description: 'Echo effect' },
  { id: 'megaphone', label: 'Megaphone', icon: Volume2, description: 'Megaphone effect' },
];

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function getModeFlags(mode) {
  const info = RECORD_MODES.find((m) => m.id === mode);
  return info ? { hasMic: info.hasMic, hasScreen: info.hasScreen, hasCamera: info.hasCamera } : { hasMic: false, hasScreen: false, hasCamera: false };
}

function buildEffectChain(audioCtx, effectId, sourceNode) {
  const nodes = [];
  let currentNode = sourceNode;

  const inputCompressor = audioCtx.createDynamicsCompressor();
  inputCompressor.threshold.value = -20;
  inputCompressor.knee.value = 15;
  inputCompressor.ratio.value = 3;
  inputCompressor.attack.value = 0.005;
  inputCompressor.release.value = 0.1;
  currentNode.connect(inputCompressor);
  currentNode = inputCompressor;
  nodes.push(inputCompressor);

  if (effectId === 'normal') {
    const gain = audioCtx.createGain();
    gain.gain.value = 1.5;
    currentNode.connect(gain);
    nodes.push(gain);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    gain.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  if (effectId === 'deep') {
    const lowshelf = audioCtx.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.value = 300;
    lowshelf.gain.value = 10;

    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2500;
    lowpass.Q.value = 0.7;

    const gain = audioCtx.createGain();
    gain.gain.value = 1.0;

    currentNode.connect(lowshelf);
    lowshelf.connect(lowpass);
    lowpass.connect(gain);
    nodes.push(lowshelf, lowpass, gain);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    gain.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  if (effectId === 'high') {
    const highshelf = audioCtx.createBiquadFilter();
    highshelf.type = 'highshelf';
    highshelf.frequency.value = 1000;
    highshelf.gain.value = 8;

    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 400;
    highpass.Q.value = 1.0;

    const gain = audioCtx.createGain();
    gain.gain.value = 1.0;

    currentNode.connect(highpass);
    highpass.connect(highshelf);
    highshelf.connect(gain);
    nodes.push(highpass, highshelf, gain);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    gain.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  if (effectId === 'robot') {
    const waveshaper = audioCtx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '4x';

    const bandpass1 = audioCtx.createBiquadFilter();
    bandpass1.type = 'bandpass';
    bandpass1.frequency.value = 1500;
    bandpass1.Q.value = 2.0;

    const bandpass2 = audioCtx.createBiquadFilter();
    bandpass2.type = 'bandpass';
    bandpass2.frequency.value = 2500;
    bandpass2.Q.value = 1.5;

    const gain = audioCtx.createGain();
    gain.gain.value = 1.0;

    currentNode.connect(waveshaper);
    waveshaper.connect(bandpass1);
    bandpass1.connect(bandpass2);
    bandpass2.connect(gain);
    nodes.push(waveshaper, bandpass1, bandpass2, gain);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    gain.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  if (effectId === 'echo') {
    const delay = audioCtx.createDelay(1.0);
    delay.delayTime.value = 0.25;

    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.25;

    const wet = audioCtx.createGain();
    wet.gain.value = 0.35;

    const dry = audioCtx.createGain();
    dry.gain.value = 0.8;

    const merger = audioCtx.createGain();

    currentNode.connect(dry);
    dry.connect(merger);

    currentNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(merger);

    nodes.push(delay, feedback, wet, dry, merger);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    merger.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  if (effectId === 'megaphone') {
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1800;
    bandpass.Q.value = 3.0;

    const waveshaper = audioCtx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 2);
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '2x';

    const gain = audioCtx.createGain();
    gain.gain.value = 1.0;

    currentNode.connect(bandpass);
    bandpass.connect(waveshaper);
    waveshaper.connect(gain);
    nodes.push(bandpass, waveshaper, gain);

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    gain.connect(limiter);
    nodes.push(limiter);

    return { input: sourceNode, output: limiter, nodes };
  }

  return { input: sourceNode, output: currentNode, nodes };
}

export default function TeacherRecordClass() {
  const [selectedMode, setSelectedMode] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [fileName, setFileName] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [voiceEffect, setVoiceEffect] = useState('normal');
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [micLevel, setMicLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamsRef = useRef([]);
  const previewVideoRef = useRef(null);
  const timerRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const previewCtxRef = useRef(null);
  const micLevelRef = useRef(null);
  const micLevelAnimRef = useRef(null);

  const cleanupStreams = useCallback(() => {
    streamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    streamsRef.current = [];
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => track.stop());
      combinedStreamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (micLevelAnimRef.current) {
      cancelAnimationFrame(micLevelAnimRef.current);
      micLevelAnimRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (previewCtxRef.current) {
      previewCtxRef.current.close().catch(() => {});
      previewCtxRef.current = null;
    }
    setPreviewingVoice(null);
    setMicLevel(0);
  }, []);

  const stopVoicePreview = useCallback(() => {
    if (previewCtxRef.current) {
      previewCtxRef.current.close().catch(() => {});
      previewCtxRef.current = null;
    }
    setPreviewingVoice(null);
  }, []);

  const startVoicePreview = useCallback((effectId) => {
    stopVoicePreview();
    setVoiceEffect(effectId);
    if (effectId === 'normal') return;

    const micStream = streamsRef.current.find((s) => {
      return s.getAudioTracks().length > 0 && s.getVideoTracks().length === 0;
    });
    if (!micStream) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      previewCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(micStream);
      const effect = buildEffectChain(ctx, effectId, source);
      effect.output.connect(ctx.destination);

      setPreviewingVoice(effectId);
    } catch (e) {
      console.warn('Voice preview failed:', e);
    }
  }, [stopVoicePreview]);

  useEffect(() => {
    return () => cleanupStreams();
  }, [cleanupStreams]);

  useEffect(() => {
    if (!permissionGranted || !selectedMode || isRecording || recordedBlob) return;
    const { hasMic } = getModeFlags(selectedMode);
    if (!hasMic || streamsRef.current.length === 0) return;

    const micStream = streamsRef.current.find((s) => s.getAudioTracks().length > 0 && s.getVideoTracks().length === 0);
    if (!micStream) return;

    let ctx = null;
    let source = null;
    let analyser = null;
    let rafId = null;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      source = ctx.createMediaStreamSource(micStream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setMicLevel(avg);
        rafId = requestAnimationFrame(update);
      };
      rafId = requestAnimationFrame(update);
    } catch (e) {
      console.warn('Mic level monitor failed:', e);
    }

    micLevelRef.current = { ctx, rafId };
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (ctx) ctx.close().catch(() => {});
    };
  }, [permissionGranted, selectedMode, isRecording, recordedBlob]);

  const setupPreview = useCallback((mode) => {
    const { hasScreen, hasCamera } = getModeFlags(mode);

    if (hasScreen && hasCamera) {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      let screenStream = null;
      let cameraStream = null;

      for (const s of streamsRef.current) {
        for (const track of s.getVideoTracks()) {
          if (track.label && track.label.toLowerCase().includes('screen')) {
            screenStream = s;
          } else {
            cameraStream = s;
          }
        }
      }

      if (!screenStream) screenStream = streamsRef.current[0];
      if (!cameraStream) cameraStream = streamsRef.current.find((s) => s !== screenStream) || streamsRef.current[1];

      const screenVideo = document.createElement('video');
      const cameraVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      cameraVideo.srcObject = cameraStream;
      screenVideo.muted = true;
      cameraVideo.muted = true;
      screenVideo.play().catch(() => {});
      cameraVideo.play().catch(() => {});

      const drawFrame = () => {
        if (!canvasRef.current) return;
        const sw = screenVideo.videoWidth;
        const sh = screenVideo.videoHeight;
        if (!sw || !sh) {
          canvas.width = 1920;
          canvas.height = 1080;
        } else {
          canvas.width = sw;
          canvas.height = sh;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        const cw = cameraVideo.videoWidth;
        const ch = cameraVideo.videoHeight;
        if (cw && ch) {
          const camW = Math.floor(canvas.width * 0.25);
          const camH = Math.floor((ch / cw) * camW);
          const camX = canvas.width - camW - 16;
          const camY = canvas.height - camH - 16;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(camX, camY, camW, camH, 10);
          ctx.clip();
          ctx.drawImage(cameraVideo, camX, camY, camW, camH);
          ctx.restore();
        }

        animationRef.current = requestAnimationFrame(drawFrame);
      };

      const waitForVideo = () => {
        if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
          drawFrame();
        } else {
          setTimeout(waitForVideo, 100);
        }
      };
      waitForVideo();

      const combinedStream = canvas.captureStream(30);
      combinedStreamRef.current = combinedStream;

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
      }
    } else if (hasScreen) {
      const screenStream = streamsRef.current.find((s) => s.getVideoTracks().length > 0) || streamsRef.current[0];
      if (previewVideoRef.current && screenStream) {
        previewVideoRef.current.srcObject = screenStream;
      }
    } else if (hasCamera) {
      const cameraStream = streamsRef.current.find((s) => s.getVideoTracks().length > 0);
      if (previewVideoRef.current && cameraStream) {
        previewVideoRef.current.srcObject = cameraStream;
      }
    }
  }, []);

  useEffect(() => {
    if (permissionGranted && selectedMode && !isRecording && !recordedBlob) {
      requestAnimationFrame(() => {
        setupPreview(selectedMode);
      });
    }
  }, [permissionGranted, selectedMode, isRecording, recordedBlob, setupPreview]);

  const requestPermissions = useCallback(async (mode) => {
    setError(null);
    setPermissionGranted(null);
    cleanupStreams();

    const { hasMic, hasScreen, hasCamera } = getModeFlags(mode);

    try {
      if (hasMic) {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        streamsRef.current.push(micStream);
      }
    } catch (e) {
      setError('Microphone permission denied. Please allow microphone access.');
      setPermissionGranted(false);
      cleanupStreams();
      return false;
    }

    try {
      if (hasScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        streamsRef.current.push(screenStream);
        screenStream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          setIsRecording(false);
          setIsPaused(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };
      }
    } catch (e) {
      setError('Screen share permission denied or cancelled.');
      setPermissionGranted(false);
      cleanupStreams();
      return false;
    }

    try {
      if (hasCamera) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamsRef.current.push(cameraStream);
      }
    } catch (e) {
      setError('Camera permission denied. Please allow camera access.');
      setPermissionGranted(false);
      cleanupStreams();
      return false;
    }

    setPermissionGranted(true);
    return true;
  }, [cleanupStreams]);

  const buildRecordStream = useCallback((mode) => {
    const { hasMic, hasScreen, hasCamera } = getModeFlags(mode);

    const stream = new MediaStream();

    if (hasScreen && hasCamera && combinedStreamRef.current) {
      combinedStreamRef.current.getVideoTracks().forEach((t) => stream.addTrack(t));
    } else {
      streamsRef.current.forEach((s) => {
        s.getVideoTracks().forEach((t) => stream.addTrack(t));
      });
    }

    if (hasMic) {
      const micStream = streamsRef.current.find((s) => {
        return s.getAudioTracks().length > 0 && s.getVideoTracks().length === 0;
      });

      if (micStream) {
        if (voiceEffect === 'normal') {
          micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } else {
          try {
            if (audioCtxRef.current) {
              audioCtxRef.current.close().catch(() => {});
            }
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(micStream);
            const effect = buildEffectChain(audioCtx, voiceEffect, source);
            const destination = audioCtx.createMediaStreamDestination();
            effect.output.connect(destination);
            const processedTrack = destination.stream.getAudioTracks()[0];
            if (processedTrack) {
              stream.addTrack(processedTrack);
            } else {
              micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
            }
          } catch (e) {
            console.warn('Audio processing failed, using raw:', e);
            micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
          }
        }
      }
    }

    if (stream.getTracks().length === 0) return null;
    return stream;
  }, [voiceEffect]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback((mode) => {
    stopVoicePreview();
    chunksRef.current = [];
    setIsPaused(false);
    setElapsedTime(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setError(null);

    const recordStream = buildRecordStream(mode);
    if (!recordStream) {
      setError('No media streams available to record.');
      return;
    }

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    }

    const recorder = new MediaRecorder(recordStream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      cleanupStreams();
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }, [buildRecordStream, cleanupStreams, stopVoicePreview]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    const modeLabel = RECORD_MODES.find((m) => m.id === selectedMode)?.label || 'Recording';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const defaultName = `Class_${modeLabel.replace(/\s+/g, '_')}_${timestamp}`;
    const finalName = fileName.trim() || defaultName;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';

    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = `${finalName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setRecordings((prev) => [
      { id: Date.now(), name: finalName, size: recordedBlob.size, time: new Date().toLocaleTimeString(), duration: formatTime(elapsedTime), voice: voiceEffect },
      ...prev,
    ]);
  }, [recordedBlob, recordedUrl, fileName, selectedMode, elapsedTime, voiceEffect]);

  const resetRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsedTime(0);
    setError(null);
    setIsRecording(false);
    setIsPaused(false);
    chunksRef.current = [];
  }, [recordedUrl]);

  const selectMode = useCallback(async (mode) => {
    if (isRecording) return;
    setSelectedMode(mode);
    resetRecording();
    await requestPermissions(mode);
  }, [isRecording, requestPermissions, resetRecording]);

  const { hasMic: modeHasMic, hasScreen: modeHasScreen, hasCamera: modeHasCamera } = getModeFlags(selectedMode);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Video size={32} className="text-indigo-600" />
            Record Class
          </h1>
          <p className="text-gray-500 mt-2">Choose what you want to record and capture your class session</p>
        </div>

        {!selectedMode && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Recording Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {RECORD_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => selectMode(mode.id)}
                    className="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-indigo-400 p-6 text-left transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{mode.label}</h3>
                    <p className="text-sm text-gray-500">{mode.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedMode && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const mode = RECORD_MODES.find((m) => m.id === selectedMode);
                  const Icon = mode.icon;
                  return (
                    <>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900">{mode.label}</h2>
                        <p className="text-xs text-gray-500">{mode.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              {!isRecording && !recordedBlob && (
                <button
                  onClick={() => { cleanupStreams(); setSelectedMode(null); resetRecording(); }}
                  className="text-sm text-gray-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={14} /> Change Mode
                </button>
              )}
            </div>

            {modeHasMic && !isRecording && !recordedBlob && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-green-600" />
                    <h3 className="font-bold text-gray-900 text-sm">Noise Cancellation</h3>
                  </div>
                  <button
                    onClick={() => setNoiseCancellation(!noiseCancellation)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${noiseCancellation ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${noiseCancellation ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 -mt-2">Reduces background noise and echo during recording</p>

                <div className="flex items-center gap-2">
                  <AudioLines size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Voice Changer</h3>
                  {previewingVoice && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <Headphones size={12} />
                        Listening - {VOICE_EFFECTS.find((e) => e.id === previewingVoice)?.label}
                      </span>
                      <button
                        onClick={stopVoicePreview}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                      >
                        <VolumeX size={12} /> Stop
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Click any voice to hear a live demo</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {VOICE_EFFECTS.map((effect) => {
                    const Icon = effect.icon;
                    const isActive = voiceEffect === effect.id;
                    const isPreviewing = previewingVoice === effect.id;
                    return (
                      <button
                        key={effect.id}
                        onClick={() => startVoicePreview(effect.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 relative ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {isPreviewing && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        )}
                        <Icon size={20} />
                        <span className="text-xs font-medium">{effect.label}</span>
                        {isPreviewing && (
                          <span className="text-[10px] text-green-600 font-bold">LIVE</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {voiceEffect !== 'normal' && (
                  <p className="text-xs text-indigo-500 font-medium">
                    {VOICE_EFFECTS.find((e) => e.id === voiceEffect)?.description} will be applied to your recording
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                  <button
                    onClick={() => requestPermissions(selectedMode)}
                    className="text-red-600 text-sm font-medium mt-1 hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {permissionGranted === true && !isRecording && !recordedBlob && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <p className="text-green-700 font-medium text-sm">
                  Ready to record!
                  {voiceEffect !== 'normal' && ` Voice: ${VOICE_EFFECTS.find((e) => e.id === voiceEffect)?.label}`}
                  {noiseCancellation && ` | Noise cancellation ON`}
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                {(modeHasScreen || modeHasCamera) && !recordedBlob ? (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : recordedUrl ? (
                  <video src={recordedUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400 p-8">
                    <Mic size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Audio Only Mode</p>
                    <p className="text-sm mt-1 mb-6">Your voice will be recorded without video</p>
                    {permissionGranted && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-end gap-1 h-12">
                          {[...Array(12)].map((_, i) => (
                            <div
                              key={i}
                              className="w-2 bg-green-500 rounded-t transition-all duration-75"
                              style={{
                                height: `${Math.max(4, micLevel * 120 * (0.5 + Math.random() * 0.5))}%`,
                                opacity: 0.5 + micLevel * 0.5,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-green-500 font-medium">MIC ACTIVE</span>
                      </div>
                    )}
                  </div>
                )}

                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isPaused ? 'bg-yellow-500/90' : 'bg-red-500/90'} text-white text-sm font-bold backdrop-blur-sm`}>
                      {!isPaused && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                      <Clock size={14} />
                      <span className="font-mono">{formatTime(elapsedTime)}</span>
                      {isPaused && <span className="text-yellow-100">PAUSED</span>}
                    </div>
                  </div>
                )}

                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
                    <Circle size={8} className="fill-red-500 text-red-500 animate-pulse" />
                    REC
                  </div>
                )}

                {isRecording && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    {modeHasMic && voiceEffect !== 'normal' && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/90 text-white text-xs font-medium backdrop-blur-sm">
                        <AudioLines size={12} />
                        {VOICE_EFFECTS.find((e) => e.id === voiceEffect)?.label}
                      </span>
                    )}
                    {modeHasMic && noiseCancellation && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium backdrop-blur-sm">
                        <ShieldCheck size={12} />
                        NC
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6">
                {!isRecording && !recordedBlob && permissionGranted !== false && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => startRecording(selectedMode)}
                      disabled={permissionGranted === false}
                      className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Circle size={20} className="fill-white" />
                      Start Recording
                    </button>
                  </div>
                )}

                {isRecording && (
                  <div className="flex justify-center gap-4">
                    {!isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-all duration-200 active:scale-95"
                      >
                        <Settings size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all duration-200 active:scale-95"
                      >
                        <Circle size={18} className="fill-white" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all duration-200 active:scale-95"
                    >
                      <Square size={18} className="fill-white" />
                      Stop Recording
                    </button>
                  </div>
                )}

                {recordedBlob && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                      <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-green-700 font-medium text-sm">Recording complete!</p>
                        <p className="text-green-600 text-xs mt-0.5">
                          Duration: {formatTime(elapsedTime)} | Size: {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
                          {voiceEffect !== 'normal' && ` | Voice: ${VOICE_EFFECTS.find((e) => e.id === voiceEffect)?.label}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Enter file name (optional)"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                      />
                      <button
                        onClick={downloadRecording}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 active:scale-95"
                      >
                        <Download size={18} />
                        Save to Device
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { resetRecording(); requestPermissions(selectedMode); }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                      >
                        <RotateCcw size={14} /> Record Again
                      </button>
                      <button
                        onClick={() => { cleanupStreams(); setSelectedMode(null); resetRecording(); setVoiceEffect('normal'); }}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {recordings.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Saved Recordings This Session</h3>
                <div className="space-y-2">
                  {recordings.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Video size={16} className="text-indigo-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{rec.name}</p>
                          <p className="text-xs text-gray-500">
                            {rec.duration} | {(rec.size / (1024 * 1024)).toFixed(2)} MB | {rec.time}
                            {rec.voice !== 'normal' && ` | ${VOICE_EFFECTS.find((e) => e.id === rec.voice)?.label}`}
                          </p>
                        </div>
                      </div>
                      <CheckCircle2 size={16} className="text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

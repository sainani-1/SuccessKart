import React, { useEffect, useRef, useState } from 'react';
import { Camera, UserCheck, RefreshCw, CheckCircle, X, ScanFace } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import AuthShell from '../components/AuthShell';

const FACE_BACKEND_URL = import.meta.env.VITE_FACE_BACKEND_URL || 'http://localhost:5000';

const FaceRegister = () => {
  const { profile } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (profile?.face_auth_enabled) {
      setAlreadyRegistered(true);
    }
  }, [profile]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setErrorMsg('');
    setMessage('');
    setCapturedImage(null);
    setCapturedDataUrl(null);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to access camera.');
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFace = () => {
    if (!cameraReady || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    setCapturedDataUrl(dataUrl);
    stopCamera();
    setMessage('Face captured! Click "Register Face" to save.');
  };

  const registerFace = async () => {
    if (!profile?.email) {
      setErrorMsg('Profile not loaded. Please try again.');
      return;
    }
    if (!capturedDataUrl) {
      setErrorMsg('Capture your face first.');
      return;
    }

    setRegistering(true);
    setErrorMsg('');
    setMessage('Registering face with server...');

    try {
      const response = await fetch(`${FACE_BACKEND_URL}/api/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          image_base64: capturedDataUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
      setMessage('');
      setCapturedImage(null);
      setCapturedDataUrl(null);
      setAlreadyRegistered(true);
    } catch (err) {
      setErrorMsg(err?.message || 'Could not register face. Is the Python backend running?');
      setMessage('');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="rounded-xl bg-gradient-to-r from-slate-900 to-cyan-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <ScanFace size={28} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Face Recognition</p>
              <h1 className="mt-1 text-2xl font-black">Register Face</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-cyan-50">
            Register your face once. You can then log in instantly using face recognition without a password.
          </p>
        </div>

        {alreadyRegistered && !success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Your face is already registered. Registering again will replace your previous face data.
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle className="mx-auto text-emerald-600" size={48} />
            <h2 className="mt-3 text-lg font-bold text-emerald-900">Face Registered Successfully!</h2>
            <p className="mt-2 text-sm text-emerald-700">
              You can now use face recognition to log in. Go to the login page and click "Login with Face".
            </p>
            <button
              onClick={() => { setSuccess(false); setAlreadyRegistered(true); }}
              className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        )}

        {!success && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {!capturedImage ? (
              <div className="overflow-hidden rounded-xl bg-slate-950">
                <video ref={videoRef} autoPlay muted playsInline className="h-80 w-full object-cover" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl bg-slate-950">
                <img src={capturedImage} alt="Captured face" className="h-80 w-full object-contain" />
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {errorMsg}
              </div>
            )}
            {message && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {!cameraReady && !capturedImage && (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={cameraLoading || registering}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Camera size={16} />
                  {cameraLoading ? 'Starting...' : 'Start Camera'}
                </button>
              )}

              {cameraReady && (
                <button
                  type="button"
                  onClick={captureFace}
                  disabled={registering}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  <Camera size={16} />
                  Capture Face
                </button>
              )}

              {capturedImage && (
                <>
                  <button
                    type="button"
                    onClick={registerFace}
                    disabled={registering}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <UserCheck size={16} />
                    {registering ? 'Registering...' : 'Register Face'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCapturedImage(null); setCapturedDataUrl(null); startCamera(); }}
                    disabled={registering}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    <RefreshCw size={16} />
                    Retake
                  </button>
                </>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Make sure your face is clearly visible and well-lit. Look straight at the camera.
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  );
};

export default FaceRegister;

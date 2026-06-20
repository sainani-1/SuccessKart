import React, { useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  LiveKitRoom, RoomAudioRenderer, useTracks, useLocalParticipant,
  useRemoteParticipants, TrackRefContext, ParticipantTile,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Video, XCircle, Mic, MicOff, Camera, CameraOff, Monitor, Copy, LogOut, Users, Loader2,
} from 'lucide-react';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, '') || window.location.origin;

class RoomErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center space-y-2">
            <p className="text-red-400 text-lg font-semibold">Something went wrong</p>
            <p className="text-slate-400 text-sm">Try reconnecting or create a new meeting.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 h-full">
      {tracks.map(track => (
        <TrackRefContext.Provider key={track.participant.identity + track.source} value={track}>
          <ParticipantTile participant={track.participant} />
        </TrackRefContext.Provider>
      ))}
    </div>
  );
}

function ControlBar({ roomName, onLeave }) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const total = 1 + (remoteParticipants?.length || 0);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [screenOn, setScreenOn] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(!micOn);
  }, [localParticipant, micOn]);

  const toggleCam = useCallback(async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!camOn);
    setCamOn(!camOn);
  }, [localParticipant, camOn]);

  const toggleScreen = useCallback(async () => {
    if (!localParticipant) return;
    if (screenOn) {
      await localParticipant.setScreenShareEnabled(false);
      setScreenOn(false);
    } else {
      await localParticipant.setScreenShareEnabled(true);
      setScreenOn(true);
    }
  }, [localParticipant, screenOn]);

  const copyLink = useCallback(() => {
    const link = `${APP_URL}/meet/rooms/${roomName}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomName]);

  return (
    <div className="bg-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Users size={16} />
        <span>{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition ${micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white'}`}
          title={micOn ? 'Mute' : 'Unmute'}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          onClick={toggleCam}
          className={`p-3 rounded-full transition ${camOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white'}`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? <Camera size={18} /> : <CameraOff size={18} />}
        </button>
        <button
          onClick={toggleScreen}
          className={`p-3 rounded-full transition ${screenOn ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title={screenOn ? 'Stop sharing' : 'Share screen'}
        >
          <Monitor size={18} />
        </button>
        <button
          onClick={copyLink}
          className="p-3 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition relative"
          title="Copy meeting link"
        >
          <Copy size={18} />
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>
        <button
          onClick={onLeave}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition ml-2"
          title="Leave meeting"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

const MeetRoom = () => {
  const { roomName } = useParams();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');
  const urlServerUrl = searchParams.get('serverUrl');
  const [disconnected, setDisconnected] = React.useState(false);
  const [token, setToken] = React.useState(urlToken || null);
  const [serverUrl, setServerUrl] = React.useState(urlServerUrl || null);
  const [loading, setLoading] = React.useState(!urlToken);

  useEffect(() => {
    if (urlToken && urlServerUrl) return;

    const fetchToken = async () => {
      try {
        const res = await fetch(`${APP_URL}/api/v1/meet/rooms/${roomName}/token`, { method: 'POST' });
        const data = await res.json();
        if (data.token && data.server_url) {
          setToken(data.token);
          setServerUrl(data.server_url);
          if (!urlServerUrl) window.history.replaceState(null, '', `/meet/rooms/${roomName}?token=${data.token}&serverUrl=${encodeURIComponent(data.server_url)}`);
        } else {
          setDisconnected(true);
        }
      } catch {
        setDisconnected(true);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [roomName, urlToken, urlServerUrl]);

  const handleLeave = useCallback(() => {
    setDisconnected(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400">Joining room...</p>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Cannot Join</h1>
          <p className="text-slate-500">This meeting room could not be found or is no longer active.</p>
        </div>
      </div>
    );
  }

  if (disconnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md space-y-4">
          <Video size={48} className="text-slate-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">You left the meeting</h1>
          <p className="text-slate-500">Room: {roomName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 flex flex-col">
      <div className="bg-slate-850 px-4 py-2 flex items-center justify-between text-white shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Video size={18} className="text-blue-400" />
          <span className="font-semibold">{roomName}</span>
        </div>
      </div>
      <div className="flex-1 relative">
        <RoomErrorBoundary>
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            audio
            video
            className="h-full w-full"
            onDisconnected={() => setDisconnected(true)}
          >
            <RoomAudioRenderer />
            <VideoGrid />
            <ControlBar roomName={roomName} onLeave={handleLeave} />
          </LiveKitRoom>
        </RoomErrorBoundary>
      </div>
    </div>
  );
};

export default MeetRoom;

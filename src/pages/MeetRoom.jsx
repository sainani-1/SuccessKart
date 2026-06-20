import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  LiveKitRoom, RoomAudioRenderer, useTracks, useLocalParticipant,
  useRemoteParticipants, useChat, TrackRefContext, ParticipantTile,
  ChatEntry,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Video, XCircle, Mic, MicOff, Camera, CameraOff, Monitor, Copy,
  LogOut, Users, MessageSquare, Crown,
  Loader2, Send,
} from 'lucide-react';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, '') || window.location.origin;

function isHost(participant) {
  return participant?.identity?.startsWith('meet:host:');
}
function displayName(participant) {
  return participant?.name || participant?.identity?.slice(10) || 'Anonymous';
}

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
            <p className="text-slate-400 text-sm">Please try reconnecting or create a new meeting.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  if (!tracks.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p className="text-lg">Waiting for participants...</p>
      </div>
    );
  }
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

function ParticipantList() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants() || [];
  const all = localParticipant ? [localParticipant, ...remoteParticipants] : remoteParticipants;

  return (
    <div className="bg-slate-800 rounded-2xl p-3 space-y-2 w-64 shrink-0 overflow-y-auto max-h-full">
      <div className="text-sm font-semibold text-slate-300 flex items-center gap-2 px-2 pb-2 border-b border-slate-700">
        <Users size={14} /> Participants ({all.length})
      </div>
      {all.map(p => (
        <div key={p.identity} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-700 transition">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {displayName(p).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate flex items-center gap-1.5">
              {displayName(p)}
              {isHost(p) && <Crown size={12} className="text-yellow-400 shrink-0" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPanel() {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [input, setInput] = useState('');
  const listRef = React.useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;
    await send(input.trim());
    setInput('');
  }, [input, send, isSending]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="bg-slate-800 rounded-2xl flex flex-col w-72 shrink-0 max-h-full">
      <div className="p-3 text-sm font-semibold text-slate-300 flex items-center gap-2 border-b border-slate-700">
        <MessageSquare size={14} /> Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: 'calc(100% - 100px)' }}>
        {chatMessages.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">No messages yet</p>
        )}
        {chatMessages.map((msg, i) => (
          <ChatEntry key={msg.timestamp ?? i} entry={msg} />
        ))}
      </div>
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-slate-700 text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlBar({ roomName, onLeave, onToggleParticipants, onToggleChat, showParticipants, showChat }) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const total = 1 + (remoteParticipants?.length || 0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [copied, setCopied] = useState(false);

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
        <button onClick={toggleMic}
          className={`p-3 rounded-full transition ${micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white'}`}
          title={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button onClick={toggleCam}
          className={`p-3 rounded-full transition ${camOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white'}`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}>
          {camOn ? <Camera size={18} /> : <CameraOff size={18} />}
        </button>
        <button onClick={toggleScreen}
          className={`p-3 rounded-full transition ${screenOn ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title={screenOn ? 'Stop sharing' : 'Share screen'}>
          <Monitor size={18} />
        </button>
        <button onClick={copyLink}
          className="p-3 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition relative"
          title="Copy meeting link">
          <Copy size={18} />
          {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">Copied!</span>}
        </button>
        <button onClick={onToggleParticipants}
          className={`p-3 rounded-full transition ${showParticipants ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title="Participants">
          <Users size={18} />
        </button>
        <button onClick={onToggleChat}
          className={`p-3 rounded-full transition ${showChat ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title="Chat">
          <MessageSquare size={18} />
        </button>
        <button onClick={onLeave}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition ml-2"
          title="Leave meeting">
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
  const [disconnected, setDisconnected] = useState(false);
  const [token, setToken] = useState(urlToken || null);
  const [serverUrl, setServerUrl] = useState(urlServerUrl || null);
  const [loading, setLoading] = useState(!urlToken);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);

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
        } else setDisconnected(true);
      } catch {
        setDisconnected(true);
      } finally { setLoading(false); }
    };
    fetchToken();
  }, [roomName, urlToken, urlServerUrl]);

  const handleLeave = useCallback(() => setDisconnected(true), []);

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
          <p className="text-slate-500">This meeting room is not available.</p>
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
      <div className="flex-1 flex flex-col min-h-0">
        <RoomErrorBoundary>
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            audio
            video
            className="flex-1 flex flex-col min-h-0"
            onDisconnected={() => setDisconnected(true)}
          >
            <RoomAudioRenderer />
            <div className="flex-1 flex overflow-hidden">
              {showParticipants && (
                <div className="h-full overflow-y-auto p-2 shrink-0">
                  <ParticipantList />
                </div>
              )}
              <div className="flex-1 relative min-w-0">
                <VideoGrid />
              </div>
              {showChat && (
                <div className="h-full overflow-y-auto p-2 shrink-0">
                  <ChatPanel />
                </div>
              )}
            </div>
            <ControlBar
              roomName={roomName}
              onLeave={handleLeave}
              onToggleParticipants={() => setShowParticipants(p => !p)}
              onToggleChat={() => setShowChat(c => !c)}
              showParticipants={showParticipants}
              showChat={showChat}
            />
          </LiveKitRoom>
        </RoomErrorBoundary>
      </div>
    </div>
  );
};

export default MeetRoom;

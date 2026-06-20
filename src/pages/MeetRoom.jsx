import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, useTracks, ParticipantTile } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Video, XCircle } from 'lucide-react';

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 h-full">
      {tracks.map(track => (
        <ParticipantTile key={track.participant.identity + track.source} participant={track.participant} />
      ))}
    </div>
  );
}

const MeetRoom = () => {
  const { roomName } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const serverUrl = searchParams.get('serverUrl');
  const [disconnected, setDisconnected] = React.useState(false);

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Meeting Link</h1>
          <p className="text-slate-500">This meeting link is missing connection details. Please check the URL or generate a new one.</p>
        </div>
      </div>
    );
  }

  if (disconnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <Video size={48} className="text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">You left the meeting</h1>
          <p className="text-slate-500">Room: {roomName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 flex flex-col">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <Video size={18} className="text-blue-400" />
          <span className="font-semibold">{roomName}</span>
        </div>
      </div>
      <div className="flex-1 relative">
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
        </LiveKitRoom>
      </div>
    </div>
  );
};

export default MeetRoom;

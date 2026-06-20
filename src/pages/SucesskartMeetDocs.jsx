import React, { useEffect, useState } from 'react';
import { Video, Key, CreditCard, ExternalLink, Code, Terminal, Globe, MousePointerClick } from 'lucide-react';
import { supabase } from '../supabaseClient';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'http://localhost:5173';

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
        <Icon size={20} className="text-blue-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
    {children}
  </div>
);

const CodeBlock = ({ children }) => (
  <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap">
    {children}
  </pre>
);

const Step = ({ num, children }) => (
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{num}</div>
    <div className="flex-1">{children}</div>
  </div>
);

const SucesskartMeetDocs = () => {
  const [supportEmail, setSupportEmail] = useState('support@sucesskart.com');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'support_contact_email')
          .maybeSingle();
        if (data?.value) setSupportEmail(data.value);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-3 pb-4 border-b border-slate-200">
        <Video size={48} className="text-blue-600 mx-auto" />
        <h1 className="text-3xl font-bold text-slate-900">SucessKart Meet API Documentation</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Create video meeting rooms instantly via API. Your users can join with one click — no login needed.
        </p>
      </div>

      <Section icon={Key} title="1. Get Your API Key">
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>Go to <a href="/sucesskart-meet-apikeys" className="text-blue-600 font-semibold hover:underline">SucessKart Meet API Keys</a></li>
          <li>Pay <strong>₹499</strong> via UPI &mdash; admin will credit <strong>90 minutes</strong> to your account</li>
          <li>Copy your API key from the page (it looks like <code className="bg-slate-100 px-1 rounded text-xs font-mono">884960d2-...</code>)</li>
        </ol>
      </Section>

      <Section icon={Terminal} title="2. Base URL & Authentication">
        <p className="text-slate-600">All requests go to:</p>
        <CodeBlock>{`${APP_URL}/api/v1/meet`}</CodeBlock>
        <p className="text-slate-600">Add these headers to every request:</p>
        <CodeBlock>{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</CodeBlock>
      </Section>

      <Section icon={Code} title="3. Create a Meeting Room">
        <Step num={1}>
          <p className="text-slate-600 font-semibold">Send a POST request:</p>
        </Step>
        <CodeBlock>{`POST /api/v1/meet/rooms
Body:
{
  "room_name": "my-meeting",     // required - letters, numbers, hyphens, underscores
  "empty_timeout": 300,           // optional - auto-close after N sec empty (default 300, min 60, max 86400)
  "max_participants": 10          // optional - max people in room (default 10, max 100)
}`}</CodeBlock>

        <Step num={2}>
          <p className="text-slate-600 font-semibold">You get back:</p>
        </Step>
        <CodeBlock>{`{
  "room_name": "my-meeting",
  "room_sid": "sucesskart-meet-my-meeting",
  "join_url": "${APP_URL}/meet/rooms/my-meeting?token=xxx&serverUrl=wss://...",
  "minutes_deducted": 5,
  "minutes_remaining": 85
}`}</CodeBlock>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm text-blue-800">
          <p><strong>join_url</strong> — paste this in a browser to join the meeting instantly</p>
          <p><strong>minutes_deducted</strong> — minutes consumed (based on empty_timeout, min 1)</p>
          <p><strong>minutes_remaining</strong> — how many minutes you have left</p>
        </div>
      </Section>

      <Section icon={MousePointerClick} title="4. Join the Meeting">
        <p className="text-slate-600">Simply open the <code className="bg-slate-100 px-1 rounded text-xs font-mono">join_url</code> in any browser:</p>
        <CodeBlock>{`${APP_URL}/meet/rooms/my-meeting?token=eyJhbGci...&serverUrl=wss://...`}</CodeBlock>
        <p className="text-slate-600">No login required. The token in the URL authenticates you automatically.</p>
      </Section>

      <Section icon={Code} title="5. List Your Rooms">
        <p className="text-slate-600 font-semibold">Endpoint:</p>
        <CodeBlock>{`GET /api/v1/meet/rooms`}</CodeBlock>
        <p className="text-slate-600 font-semibold mt-3">Response:</p>
        <CodeBlock>{`{
  "rooms": [
    {
      "room_name": "my-meeting",
      "room_sid": "sucesskart-meet-my-meeting",
      "participant_count": 2,
      "created_at": "2026-06-20T12:00:00Z"
    }
  ]
}`}</CodeBlock>
      </Section>

      <Section icon={Code} title="6. Delete a Room">
        <p className="text-slate-600 font-semibold">Endpoint:</p>
        <CodeBlock>{`DELETE /api/v1/meet/rooms/my-meeting`}</CodeBlock>
        <p className="text-slate-600 font-semibold mt-3">Response:</p>
        <CodeBlock>{`{
  "status": "deleted",
  "room_name": "my-meeting"
}`}</CodeBlock>
      </Section>

      <Section icon={Terminal} title="7. Quick Start — Copy & Paste Examples">
        <p className="text-slate-600 font-semibold">Step 1: Create a room (Windows PowerShell)</p>
        <CodeBlock>{'curl -X POST ' + APP_URL + '/api/v1/meet/rooms\n  -H "Authorization: Bearer YOUR_API_KEY"\n  -H "Content-Type: application/json"\n  -d \'{"room_name":"my-meeting"}\''}</CodeBlock>

        <p className="text-slate-600 font-semibold mt-4">Step 2: Open the <code className="bg-slate-100 px-1 rounded text-xs font-mono">join_url</code> from the response in your browser</p>
        <p className="text-slate-600 font-semibold mt-4">Step 3: Delete the room when done</p>
        <CodeBlock>{'curl -X DELETE ' + APP_URL + '/api/v1/meet/rooms/my-meeting\n  -H "Authorization: Bearer YOUR_API_KEY"'}</CodeBlock>
      </Section>

      <Section icon={Globe} title="8. Rate Limits">
        <p className="text-slate-600">
          <strong>100 requests per minute</strong> per API key. If exceeded, you get a <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code> response.
        </p>
      </Section>

      <Section icon={Key} title="9. Need Help?">
        <p className="text-slate-600">
          Contact <a href={`mailto:${supportEmail}`} className="text-blue-600 font-semibold hover:underline">{supportEmail}</a> for support.
        </p>
      </Section>

      <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-200">
        SucessKart Meet API v1.0 &mdash; Last updated: June 2026
      </div>
    </div>
  );
};

export default SucesskartMeetDocs;

import React, { useEffect, useState } from 'react';
import { Video, Key, CreditCard, ExternalLink, Code, Terminal, Globe } from 'lucide-react';
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
  <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-sm font-mono leading-relaxed">
    {children}
  </pre>
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
          Integrate video meeting capabilities into your application using the SucessKart Meet API.
          Follow the steps below to get started.
        </p>
      </div>

      <Section icon={Key} title="1. Get Your API Key">
        <p className="text-slate-600">
          Visit the <a href="/sucesskart-meet-apikeys" className="text-blue-600 font-semibold hover:underline">SucessKart Meet API Keys</a> page.
          Complete the payment and you will receive your unique API key. Keep this key secure — it is used to authenticate all API requests.
        </p>
      </Section>

      <Section icon={CreditCard} title="2. Payment">
        <p className="text-slate-600">
          Access to SucessKart Meet API requires a payment of <strong>₹499 for 90 minutes</strong> of usage.
          Payment is via manual UPI transfer — once the admin confirms your payment, 90 minutes will be credited to your account.
          When your minutes run out, you can recharge with another ₹499 for another 90 minutes.
        </p>
      </Section>

      <Section icon={Terminal} title="3. Base URL">
        <p className="text-slate-600">All API requests should be made to:</p>
        <CodeBlock>{`${APP_URL}/api/v1/meet`}</CodeBlock>
      </Section>

      <Section icon={Globe} title="4. Authentication">
        <p className="text-slate-600">
          Include your API key in the <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">Authorization</code> header of every request:
        </p>
        <CodeBlock>{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</CodeBlock>
      </Section>

      <Section icon={Code} title="5. Create a Meeting Room">
        <p className="text-slate-600 font-semibold">Endpoint:</p>
        <CodeBlock>{`POST /v1/meet/rooms`}</CodeBlock>
        <p className="text-slate-600 font-semibold mt-3">Request Body:</p>
        <CodeBlock>{`{
  "room_name": "my-meeting-room",
  "empty_timeout": 300,
  "max_participants": 10
}`}</CodeBlock>
        <table className="w-full text-sm text-slate-600 border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-semibold border-b">Field</th>
              <th className="text-left px-4 py-2 font-semibold border-b">Type</th>
              <th className="text-left px-4 py-2 font-semibold border-b">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2 font-mono text-xs">room_name</td>
              <td className="px-4 py-2">string</td>
              <td className="px-4 py-2">Unique name for your meeting room</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-mono text-xs">empty_timeout</td>
              <td className="px-4 py-2">number</td>
              <td className="px-4 py-2">Auto-close room after N seconds of being empty (optional, default 300)</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-xs">max_participants</td>
              <td className="px-4 py-2">number</td>
              <td className="px-4 py-2">Maximum number of participants (optional, default 10)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-slate-600 font-semibold mt-4">Response:</p>
        <CodeBlock>{`{
  "room_name": "my-meeting-room",
  "room_sid": "RM_abc123",
  "join_url": "${APP_URL}/meet/rooms/my-meeting-room?token=xxx",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`}</CodeBlock>
        <p className="text-slate-500 text-sm mt-2">
          The <code className="bg-slate-100 px-1 rounded text-xs">join_url</code> can be opened directly in a browser.
          The <code className="bg-slate-100 px-1 rounded text-xs">token</code> is a short-lived participant token for embedding via the SDK.
        </p>
      </Section>

      <Section icon={Code} title="6. List Your Rooms">
        <p className="text-slate-600 font-semibold">Endpoint:</p>
        <CodeBlock>{`GET /v1/meet/rooms`}</CodeBlock>
        <p className="text-slate-600 font-semibold mt-3">Response:</p>
        <CodeBlock>{`{
  "rooms": [
    {
      "room_name": "my-meeting-room",
      "room_sid": "RM_abc123",
      "participant_count": 0,
      "created_at": "2026-06-19T12:00:00Z"
    }
  ]
}`}</CodeBlock>
      </Section>

      <Section icon={Code} title="7. Delete a Room">
        <p className="text-slate-600 font-semibold">Endpoint:</p>
        <CodeBlock>{`DELETE /v1/meet/rooms/{room_name}`}</CodeBlock>
        <p className="text-slate-600 font-semibold mt-3">Response:</p>
        <CodeBlock>{`{
  "status": "deleted"
}`}</CodeBlock>
      </Section>

      <Section icon={Terminal} title="8. Example: Create a Room with cURL">
        <CodeBlock>{`curl -X POST ${APP_URL}/api/v1/meet/rooms \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "room_name": "team-sync",
    "empty_timeout": 600,
    "max_participants": 20
  }'`}</CodeBlock>
      </Section>

      <Section icon={Terminal} title="9. Example: JavaScript SDK Integration">
        <p className="text-slate-600">Install the SucessKart Meet client SDK:</p>
        <CodeBlock>{`npm install @sucesskart/meet-client`}</CodeBlock>
        <p className="text-slate-600 mt-3">Use it in your app:</p>
        <CodeBlock>{`import { createRoom, joinRoom } from '@sucesskart/meet-client';

const apiKey = 'YOUR_API_KEY';

// Create a room
const room = await createRoom(apiKey, {
  room_name: 'meeting-' + Date.now(),
  max_participants: 10
});

// Join the room
joinRoom(room.token, {
  container: document.getElementById('meet-container'),
  displayName: 'John Doe'
});`}</CodeBlock>
      </Section>

      <Section icon={Globe} title="10. Rate Limits">
        <p className="text-slate-600">
          API requests are rate-limited to <strong>100 requests per minute</strong> per API key.
          If you exceed this limit, you will receive a <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code> response.
        </p>
      </Section>

      <Section icon={Key} title="11. Need Help?">
        <p className="text-slate-600">
          Contact us at <a href={`mailto:${supportEmail}`} className="text-blue-600 font-semibold hover:underline">{supportEmail}</a> for any questions or support.
        </p>
      </Section>

      <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-200">
        SucessKart Meet API v1.0 &mdash; Last updated: June 2026
      </div>
    </div>
  );
};

export default SucesskartMeetDocs;

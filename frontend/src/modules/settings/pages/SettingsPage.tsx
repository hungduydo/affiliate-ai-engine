import { useState } from 'react';
import { Sparkles, Plug, Send } from 'lucide-react';
import { PromptTemplateTable } from '../components/PromptTemplateTable';
import { ConnectorStatus } from '../components/ConnectorStatus';
import { ProviderTable } from '../components/ProviderTable';

type Tab = 'prompts' | 'connectors' | 'providers';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'prompts', label: 'Prompt Templates', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'connectors', label: 'Connectors', icon: <Plug className="h-4 w-4" /> },
  { id: 'providers', label: 'Publishing Providers', icon: <Send className="h-4 w-4" /> },
];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('prompts');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white text-xl font-semibold">Settings</h2>
        <p className="text-zinc-400 text-sm mt-1">Manage prompt templates, connector credentials, and publishing providers</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'prompts' && <PromptTemplateTable />}
        {tab === 'connectors' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Set these environment variables in{' '}
              <code className="text-violet-400 bg-zinc-800 px-1.5 py-0.5 rounded">backend/.env</code>{' '}
              and restart the server.
            </p>
            <ConnectorStatus />
          </div>
        )}
        {tab === 'providers' && <ProviderTable />}
      </div>
    </div>
  );
}

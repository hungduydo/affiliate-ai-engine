import { useState } from 'react';
import { ArrowLeft, Zap, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IngestionForm } from '../components/IngestionForm';
import { CsvDropzone } from '../components/CsvUpload/CsvDropzone';
import { ColumnMapper } from '../components/CsvUpload/ColumnMapper';
import { ImportPreview } from '../components/CsvUpload/ImportPreview';
import type { CsvPreviewResponse } from '../services/import.service';

type Tab = 'live' | 'csv';

export function ProductImportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('live');
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [csvSource, setCsvSource] = useState('clickbank');

  function handlePreview(preview: CsvPreviewResponse) {
    setCsvPreview(preview);
    // Auto-detect common column names
    const autoMap: Record<string, string> = {};
    preview.headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[\s_-]/g, '');
      if (lower.includes('id') || lower.includes('sku')) autoMap[h] = 'externalId';
      else if (lower.includes('name') || lower.includes('title') || lower.includes('product')) autoMap[h] = 'name';
      else if (lower.includes('desc')) autoMap[h] = 'description';
      else if (lower.includes('price')) autoMap[h] = 'price';
      else if (lower.includes('commission')) autoMap[h] = 'commission';
      else if (lower.includes('image') || lower.includes('img')) autoMap[h] = 'imageUrl';
      else autoMap[h] = 'skip';
    });
    setMapping(autoMap);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'live', label: 'Live Ingest', icon: <Zap className="h-4 w-4" /> },
    { id: 'csv', label: 'CSV Import', icon: <FileSpreadsheet className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">Import Products</h1>
          <p className="text-sm text-zinc-400">Pull products from affiliate networks or upload a CSV</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map(({ id, label, icon }) => (
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
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        {tab === 'live' && <IngestionForm />}

        {tab === 'csv' && (
          <div className="space-y-6">
            {!csvPreview ? (
              <CsvDropzone onPreview={handlePreview} />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-white">Map CSV Columns</h2>
                  <button
                    onClick={() => { setCsvPreview(null); setMapping({}); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Upload different file
                  </button>
                </div>

                <ColumnMapper
                  headers={csvPreview.headers}
                  mapping={mapping}
                  source={csvSource}
                  onMappingChange={setMapping}
                  onSourceChange={setCsvSource}
                />

                <ImportPreview
                  filePath={csvPreview.filePath}
                  headers={csvPreview.headers}
                  rows={csvPreview.rows}
                  mapping={mapping}
                  source={csvSource}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

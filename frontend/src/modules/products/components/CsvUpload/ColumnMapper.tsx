const PRODUCT_FIELDS = [
  { value: 'skip', label: '— Skip —' },
  { value: 'externalId', label: 'External ID (required)' },
  { value: 'name', label: 'Name (required)' },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price' },
  { value: 'commission', label: 'Commission %' },
  { value: 'imageUrl', label: 'Image URL' },
  { value: 'affiliateLink', label: 'Affiliate Link' },
  { value: 'productLink', label: 'Product Link' },
] as const;

const SOURCES = [
  { value: 'clickbank', label: 'ClickBank' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'shopee', label: 'Shopee' },
];

interface Props {
  headers: string[];
  mapping: Record<string, string>;
  source: string;
  onMappingChange: (mapping: Record<string, string>) => void;
  onSourceChange: (source: string) => void;
}

export function ColumnMapper({ headers, mapping, source, onMappingChange, onSourceChange }: Props) {
  function setField(header: string, field: string) {
    onMappingChange({ ...mapping, [header]: field });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide shrink-0">Source</label>
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                CSV Column
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Map to Field
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {headers.map((header) => (
              <tr key={header} className="bg-zinc-950">
                <td className="px-4 py-2.5 font-mono text-zinc-300 text-xs">{header}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={mapping[header] ?? 'skip'}
                    onChange={(e) => setField(header, e.target.value)}
                    className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {PRODUCT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

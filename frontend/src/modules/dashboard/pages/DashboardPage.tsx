import { Package, FileText, Send, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@shared/utils/cn';
import { productsService } from '@modules/products/services/products.service';
import { contentService } from '@modules/content/services/content.service';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 flex items-center gap-4">
      <div className={cn('size-10 rounded-lg flex items-center justify-center', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-zinc-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 1 }],
    queryFn: () => productsService.getMany({ limit: 1 }),
  });

  const { data: generatedData } = useQuery({
    queryKey: ['content', { status: 'GENERATED', limit: 1 }],
    queryFn: () => contentService.getMany({ status: 'GENERATED', limit: 1 }),
  });

  const { data: publishedData } = useQuery({
    queryKey: ['content', { status: 'PUBLISHED', limit: 1 }],
    queryFn: () => contentService.getMany({ status: 'PUBLISHED', limit: 1 }),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['content', { status: 'PENDING_APPROVAL', limit: 1 }],
    queryFn: () => contentService.getMany({ status: 'PENDING_APPROVAL', limit: 1 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-semibold">Overview</h2>
        <p className="text-zinc-400 text-sm mt-1">Platform summary and quick actions</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Products"
          value={productsData?.total ?? '—'}
          icon={Package}
          color="bg-violet-600"
        />
        <MetricCard
          label="Content Generated"
          value={generatedData?.total ?? '—'}
          icon={FileText}
          color="bg-blue-600"
        />
        <MetricCard
          label="Published"
          value={publishedData?.total ?? '—'}
          icon={Send}
          color="bg-emerald-600"
        />
        <MetricCard
          label="Pending Approval"
          value={pendingData?.total ?? '—'}
          icon={Clock}
          color="bg-yellow-600"
        />
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-white font-medium mb-3">Build Status</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            NestJS backend with isolated per-module databases
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            Product ingestion — ClickBank, CJ, Shopee, CSV import
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            BullMQ workers — product scraper, content generator, publisher
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            AI content generation via Gemini 1.5 Pro
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            Publishing to WordPress + Facebook
          </li>
        </ul>
      </div>
    </div>
  );
}

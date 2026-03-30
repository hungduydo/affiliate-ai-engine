import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@shared/layout/AppLayout';
import { DashboardPage } from '@modules/dashboard/pages/DashboardPage';
import { ProductListPage } from '@modules/products/pages/ProductListPage';
import { ProductDetailPage } from '@modules/products/pages/ProductDetailPage';
import { ProductImportPage } from '@modules/products/pages/ProductImportPage';
import { ContentListPage } from '@modules/content/pages/ContentListPage';
import { ContentGeneratePage } from '@modules/content/pages/ContentGeneratePage';
import { ContentEditorPage } from '@modules/content/pages/ContentEditorPage';
import { PublishingPage } from '@modules/publishing/pages/PublishingPage';
import { SettingsPage } from '@modules/settings/pages/SettingsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/import" element={<ProductImportPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/content/generate" element={<ContentGeneratePage />} />
          <Route path="/content/:id" element={<ContentEditorPage />} />
          <Route path="/publishing" element={<PublishingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

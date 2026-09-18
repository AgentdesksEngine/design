import { Navigate, Route, Routes } from 'react-router-dom';
import { NotMemberPage, RequireAuth } from './features/auth/AuthPages';
import { GalleryPage } from './features/gallery/GalleryPage';
import { DesignDetailPage } from './features/detail/DesignDetailPage';
import { PreviewPage } from './features/preview/PreviewPage';

export function App() {
  return (
    <Routes>
      <Route path="/not-a-member" element={<NotMemberPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <GalleryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/design/:slug"
        element={
          <RequireAuth>
            <DesignDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/design/:slug/:version"
        element={
          <RequireAuth>
            <DesignDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/preview/:slug/:version"
        element={
          <RequireAuth>
            <PreviewPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

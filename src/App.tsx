import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/ui/Toast.tsx';
import { Layout } from './components/layout/Layout.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ConnectorsListPage } from './pages/ConnectorsListPage.tsx';
import { CreateConnectorPage } from './pages/CreateConnectorPage.tsx';
import { ConnectorDetailPage } from './pages/ConnectorDetailPage.tsx';
import { TestPlaygroundPage } from './pages/TestPlaygroundPage.tsx';
import { DocsPage } from './pages/DocsPage.tsx';
import { LogsPage } from './pages/LogsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

export default function App() {
  // Use hash-based or path-based router that defaults cleanly to /dashboard
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) return hash;
      const pathname = window.location.pathname;
      return pathname && pathname !== '/' ? pathname : '/dashboard';
    }
    return '/dashboard';
  });

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        setCurrentPath(hash);
      } else {
        setCurrentPath('/dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Router dispatcher
  const renderRoute = () => {
    // Exact routes
    if (currentPath === '/' || currentPath === '/dashboard') {
      return <DashboardPage onNavigate={navigate} />;
    }
    if (currentPath === '/connectors') {
      return <ConnectorsListPage onNavigate={navigate} />;
    }
    if (currentPath === '/connectors/new') {
      return <CreateConnectorPage onNavigate={navigate} />;
    }
    if (currentPath === '/analytics') {
      return <AnalyticsPage />;
    }
    if (currentPath === '/settings') {
      return <SettingsPage />;
    }

    // Parametric routes
    // /connectors/:id/test
    const testMatch = currentPath.match(/^\/connectors\/([^/]+)\/test$/);
    if (testMatch) {
      return <TestPlaygroundPage connectorId={testMatch[1]} onNavigate={navigate} />;
    }

    // /connectors/:id/docs
    const docsMatch = currentPath.match(/^\/connectors\/([^/]+)\/docs$/);
    if (docsMatch) {
      return <DocsPage connectorId={docsMatch[1]} onNavigate={navigate} />;
    }

    // /connectors/:id/logs
    const logsMatch = currentPath.match(/^\/connectors\/([^/]+)\/logs$/);
    if (logsMatch) {
      return <LogsPage connectorId={logsMatch[1]} onNavigate={navigate} />;
    }

    // /connectors/:id/edit
    const editMatch = currentPath.match(/^\/connectors\/([^/]+)\/edit$/);
    if (editMatch) {
      return <CreateConnectorPage onNavigate={navigate} editId={editMatch[1]} />;
    }

    // /connectors/:id
    const detailMatch = currentPath.match(/^\/connectors\/([^/]+)$/);
    if (detailMatch) {
      return <ConnectorDetailPage connectorId={detailMatch[1]} onNavigate={navigate} />;
    }

    // Fallback to Dashboard
    return <DashboardPage onNavigate={navigate} />;
  };

  return (
    <ToastProvider>
      <Layout currentPath={currentPath} onNavigate={navigate}>
        {renderRoute()}
      </Layout>
    </ToastProvider>
  );
}

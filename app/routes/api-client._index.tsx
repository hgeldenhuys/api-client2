import { useEffect } from "react";
import type { Route } from "~/+types/api-client._index";
import { MainLayout } from "~/components/layout/MainLayout";
import { ViewRouter } from "~/components/ViewRouter";
import { CollectionView } from "~/components/views/CollectionView";
import { EnvironmentView } from "~/components/views/EnvironmentView";
import { SettingsView } from "~/components/views/SettingsView";
import { DocumentationView } from "~/components/views/DocumentationView";
import { BugReportView } from "~/components/views/BugReportView";
import { ViewTabs } from "~/components/ViewTabs";
import { EnvironmentManager } from "~/components/EnvironmentManager";
import { ThemeToggle } from "~/components/ThemeToggle";
import { ThemeProvider } from "~/components/ThemeProvider";
import { ConfigProvider } from "~/components/ConfigProvider";
import { useCollectionStore } from "~/stores/collectionStore";
import { useEnvironmentStore } from "~/stores/environmentStore";
import { useTheme } from "~/stores/themeStore";
import { getThemeFromRequest, type ThemeMode } from "~/cookies/theme.server";
import { demoCollection } from "~/utils/demo-collection";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "API Client" },
    { name: "description", content: "Modern API Client built with React Router" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getThemeFromRequest(request);
  return { theme };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const data = loaderData as { theme?: ThemeMode } | undefined;
  const { collections, addCollection, init: initCollections, isInitialized: collectionsInitialized } = useCollectionStore();
  const { init: initEnvironments } = useEnvironmentStore();
  const { initializeFromServer } = useTheme();
  
  useEffect(() => {
    // Initialize stores
    const initStores = async () => {
      await Promise.all([
        initCollections(),
        initEnvironments()
      ]);
    };
    
    initStores();
  }, []);
  
  // Initialize theme from server
  useEffect(() => {
    if (data?.theme) {
      initializeFromServer(data.theme);
    }
  }, [data?.theme, initializeFromServer]);
  
  // Add demo collection after initialization
  useEffect(() => {
    if (collectionsInitialized && collections.size === 0) {
      addCollection(demoCollection);
    }
  }, [collectionsInitialized, collections.size, addCollection]);
  
  // Example configuration for demonstration
  const exampleConfig = {
    branding: {
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">AC</span>
          </div>
          <span className="font-semibold">API Client</span>
        </div>
      ),
      logoLink: '/',
    },
  };

  return (
    <ConfigProvider config={exampleConfig}>
      <ThemeProvider>
        <MainLayout
          topBar={
            <div className="flex items-center justify-between w-full">
              <ViewTabs />
              <div className="flex items-center gap-2">
                <EnvironmentManager />
                <ThemeToggle />
              </div>
            </div>
          }
        >
          <ViewRouter
            collectionView={<CollectionView />}
            environmentView={<EnvironmentView />}
            documentationView={<DocumentationView />}
            bugReportView={<BugReportView />}
            settingsView={<SettingsView />}
          />
        </MainLayout>
      </ThemeProvider>
    </ConfigProvider>
  );
}

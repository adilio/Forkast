/**
 * THESIS: Forkast is a working kitchen pass, not a lifestyle scrapbook or card dashboard.
 * OWN-WORLD: Cool paper, white tickets, graphite rules, dark green clipped controls.
 * STORY: Capture a recipe, scale it, and route ingredients to the household's real stores.
 * FIRST VIEWPORT: Mobile grocery work owns the scene; desktop keeps a slim perimeter rail.
 * FORM: Mobile-first store list with a ruled desktop index; direction seed 7b39edcb.
 */
import { lazy, Suspense } from 'react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { Icon } from './components/Icon';
import { useAuth } from './lib/auth';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';

const ImportPage = lazy(() => import('./pages/ImportPage'));
const InstallPage = lazy(() => import('./pages/InstallPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const ShoppingPage = lazy(() => import('./pages/ShoppingPage'));
const CsvImportPage = lazy(() => import('./pages/CsvImportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const navItems = [
  { to: '/recipes', label: 'Recipes', icon: 'book' as const },
  { to: '/shopping', label: 'Shopping', icon: 'cart' as const },
  { to: '/import', label: 'Import', icon: 'download' as const },
  { to: '/settings', label: 'Settings', icon: 'settings' as const },
];

function NavigationLink({ to, label, icon }: (typeof navItems)[number]) {
  const [location] = useLocation();
  const active = location === to || (to === '/import' && location === '/install');

  return (
    <Link
      href={to}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function AppShell() {
  return (
    <div className="app-shell">
      <aside className="work-rail">
        <Link className="brand" href="/recipes" aria-label="Forkast recipes">
          <img src="/forkast-mark.svg" alt="" width="34" height="34" />
          <span>Forkast</span>
        </Link>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <NavigationLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="sync-note" role="status">
          <Icon name="wifi" />
          <span>Ready when service is spotty</span>
        </div>
      </aside>

      <main className="work-surface">
        <Suspense fallback={<div className="page-skeleton" aria-label="Loading" />}>
          <Switch>
            <Route path="/recipes" component={RecipesPage} />
            <Route path="/shopping" component={ShoppingPage} />
            <Route path="/import" component={ImportPage} />
            <Route path="/import-csv" component={CsvImportPage} />
            <Route path="/install" component={InstallPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route>
              <Redirect to="/recipes" />
            </Route>
          </Switch>
        </Suspense>
      </main>

      <nav className="bottom-rail" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavigationLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const { user, householdId, loading, configured } = useAuth();
  if (loading)
    return (
      <div className="boot-screen">
        <img src="/forkast-mark.svg" alt="" />
        <span>Opening Forkast…</span>
      </div>
    );
  if (!configured) return <AppShell />;
  if (!user) return <AuthPage />;
  if (!householdId) return <OnboardingPage />;
  return <AppShell />;
}

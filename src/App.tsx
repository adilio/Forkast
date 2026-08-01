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

const ImportPage = lazy(() => import('./pages/ImportPage'));
const InstallPage = lazy(() => import('./pages/InstallPage'));

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
    <Link href={to} className={active ? 'active' : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function Placeholder({ title, action }: { title: string; action: string }) {
  return (
    <section className="empty-workspace" aria-labelledby="empty-title">
      <div className="empty-workspace__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="kicker">Your household workspace</p>
      <h1 id="empty-title">{title}</h1>
      <p>{action}</p>
    </section>
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
            <Route path="/recipes">
              <Placeholder
                title="Recipes, without the runaround"
                action="Save a recipe from a website or add the first one by hand."
              />
            </Route>
            <Route path="/shopping">
              <Placeholder
                title="A clear list for each store"
                action="City Market and Costco will stay in sync here, even through a patch of bad service."
              />
            </Route>
            <Route path="/import" component={ImportPage} />
            <Route path="/install" component={InstallPage} />
            <Route path="/settings">
              <Placeholder
                title="Household settings"
                action="Sign-in, invites, exports, and installation help live here."
              />
            </Route>
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
  return <AppShell />;
}

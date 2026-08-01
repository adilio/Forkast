import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Icon } from '../components/Icon';

export default function ImportPage() {
  const params = new URLSearchParams(window.location.search);
  const incomingUrl = params.get('url') ?? '';
  const [url, setUrl] = useState(incomingUrl);
  const sourceHost = useMemo(() => {
    try {
      return incomingUrl ? new URL(incomingUrl).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  }, [incomingUrl]);

  return (
    <section className="task-page" aria-labelledby="import-title">
      <header className="task-page__header">
        <p className="kicker">Bring only the useful parts</p>
        <h1 id="import-title">Save a recipe</h1>
        <p>
          Forkast looks for the title, servings, ingredients, and directions. You review
          everything before saving.
        </p>
      </header>

      {incomingUrl ? (
        <div className="incoming-ticket" role="status">
          <span className="incoming-ticket__step">1</span>
          <div>
            <strong>Recipe link received</strong>
            <span>{sourceHost || 'Check the URL below'}</span>
          </div>
          <Icon name="check" />
        </div>
      ) : null}

      <form className="url-form" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="recipe-url">Recipe website URL</label>
        <div className="url-form__row">
          <input
            id="recipe-url"
            name="url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://example.com/recipe"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
          <button className="button button--primary" type="submit" disabled={!url}>
            Review recipe
          </button>
        </div>
        <p>
          Normal recipe pages work best. Login-walled and social sites may need manual
          entry.
        </p>
      </form>

      <aside className="shortcut-callout">
        <div>
          <p className="kicker">Faster on iPhone</p>
          <h2>Share straight to Forkast</h2>
          <p>
            Install the small Save to Forkast Shortcut once, then use it from Safari's
            Share Sheet.
          </p>
        </div>
        <Link className="button button--outline" href="/install">
          See iPhone setup
        </Link>
      </aside>
    </section>
  );
}

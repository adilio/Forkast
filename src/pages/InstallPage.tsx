export default function InstallPage() {
  return (
    <article className="task-page reading-page" aria-labelledby="install-title">
      <header className="task-page__header">
        <p className="kicker">One-time iPhone setup</p>
        <h1 id="install-title">Put Forkast in the Share Sheet</h1>
        <p>
          Safari cannot add a web app directly to the iPhone Share Sheet, so a tiny
          Shortcut carries the current page URL into Forkast.
        </p>
      </header>
      <ol className="setup-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Install Forkast</strong>
            <p>
              In Safari, open the Share menu, choose Add to Home Screen, then confirm
              Add.
            </p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Create “Save to Forkast”</strong>
            <p>
              In Shortcuts, make a shortcut that receives URLs from the Share Sheet.
            </p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Open the import link</strong>
            <p>
              Add the URL Encode action for the Shortcut Input. Put its result after{' '}
              <code>https://forkast.4dl.ca/import?url=</code> in a Text action, then
              pass that text to Open URLs.
            </p>
          </div>
        </li>
        <li>
          <span>4</span>
          <div>
            <strong>Try one recipe</strong>
            <p>
              From a normal recipe page in Safari, tap Share, then Save to Forkast. Sign
              in if asked and review the clean draft.
            </p>
          </div>
        </li>
      </ol>
      <div className="honest-note">
        <strong>If a site blocks access</strong>
        <p>
          Forkast keeps the source URL and opens manual entry. It never tries to bypass
          a login or CAPTCHA.
        </p>
      </div>
    </article>
  );
}

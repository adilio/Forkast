import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../lib/auth';
import { parsePlanToEatCsv, type CsvPreview } from '../lib/csv';
import { getRecipeDuplicateKeys, saveRecipe } from '../lib/data';
import { recipeDuplicateKey } from '../lib/recipes';
export default function CsvImportPage() {
  const { householdId } = useAuth();
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function choose(file: File) {
    setProgress('Checking the file against your recipe book…');
    const parsed = parsePlanToEatCsv(await file.text());
    const existing = householdId
      ? await getRecipeDuplicateKeys(householdId)
      : new Set<string>();
    const warnings = [...parsed.warnings];
    const recipes = parsed.recipes.filter((recipe) => {
      const key = recipeDuplicateKey(recipe);
      if (!existing.has(key)) return true;
      warnings.push(`${recipe.title}: already in Forkast, skipped`);
      return false;
    });
    setPreview({ ...parsed, recipes, warnings });
    setReport([]);
    setProgress('');
  }
  async function run() {
    if (!preview) return;
    setBusy(true);
    const messages: string[] = [];
    for (let i = 0; i < preview.recipes.length; i++) {
      setProgress(`Importing ${i + 1} of ${preview.recipes.length}`);
      try {
        await saveRecipe(householdId!, preview.recipes[i]);
      } catch (e) {
        messages.push(
          `${preview.recipes[i].title}: ${e instanceof Error ? e.message : 'failed'}`,
        );
      }
    }
    setProgress(`Imported ${preview.recipes.length - messages.length} recipes`);
    setReport(messages);
    setBusy(false);
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            completedAt: new Date().toISOString(),
            warnings: preview?.warnings,
            failures: report,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forkast-import-report.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <section className="task-page">
      <header className="page-heading">
        <p className="kicker">Plan to Eat migration</p>
        <h1>Import recipe CSV</h1>
        <p>
          The file stays in this browser. Review the mapping before anything is written.
        </p>
      </header>
      <label className="file-drop">
        Choose Plan to Eat CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])}
        />
      </label>
      {preview && (
        <div className="import-preview">
          <h2>{preview.recipes.length} recipes ready</h2>
          <p>
            Recognized {preview.columns.length - preview.unknownColumns.length} columns.
            Preserving {preview.unknownColumns.length} unknown columns.
          </p>
          {preview.warnings.length > 0 && (
            <details>
              <summary>{preview.warnings.length} warnings</summary>
              <ul>
                {preview.warnings.slice(0, 50).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </details>
          )}
          <ol className="preview-recipes">
            {preview.recipes.slice(0, 20).map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong>
                <span>{r.ingredients.length} ingredients</span>
              </li>
            ))}
          </ol>
          {preview.recipes.length > 20 && (
            <p>And {preview.recipes.length - 20} more.</p>
          )}
          <button
            className="button button--primary"
            onClick={run}
            disabled={busy || !preview.recipes.length}
          >
            {busy ? progress || 'Starting import…' : 'Import recipes'}
          </button>
        </div>
      )}
      {progress && (
        <p className="connection-state" role="status">
          {progress}
        </p>
      )}
      {report.length > 0 && (
        <button className="button button--outline" onClick={download}>
          Download error report
        </button>
      )}
      <Link className="text-button" href="/recipes">
        ← Back to recipes
      </Link>
    </section>
  );
}

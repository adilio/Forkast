import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Forkast shell', () => {
  it('accepts a recipe URL from the iPhone shortcut route', async () => {
    window.history.pushState({}, '', '/import?url=https%3A%2F%2Fexample.com%2Frecipe');
    render(<App />);

    expect(await screen.findByText('Recipe link received')).toBeVisible();
    expect(screen.getByDisplayValue('https://example.com/recipe')).toBeVisible();
  });

  it('explains how to install the iPhone shortcut', async () => {
    window.history.pushState({}, '', '/install');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Put Forkast in the Share Sheet' }),
    ).toBeVisible();
  });
});

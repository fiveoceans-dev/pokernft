import { render, screen } from '@testing-library/react';
import LobbyPage from './page';
import { expect, test } from 'vitest';

// basic render test for lobby

test('renders lobby with table links', () => {
  render(<LobbyPage />);
  expect(screen.getByText('Lobby')).toBeInTheDocument();
  const links = screen.getAllByRole('link', { name: 'Join' });
  expect(links[0]).toHaveAttribute('href', '/play?table=demo');
});


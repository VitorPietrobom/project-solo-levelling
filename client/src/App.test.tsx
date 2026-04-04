import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app with portal text', () => {
    render(<App />);
    expect(screen.getByText('Level Up Portal')).toBeInTheDocument();
  });
});

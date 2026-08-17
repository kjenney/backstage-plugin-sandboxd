import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppCardStatus } from './AppCardStatus';

describe('AppCardStatus', () => {
  it('renders running status with green indicator', () => {
    const { container } = render(<AppCardStatus status="running" />);
    const chip = container.querySelector('span');
    expect(chip).toHaveTextContent('Running');
  });

  it('renders sleeping status with amber indicator', () => {
    const { container } = render(<AppCardStatus status="sleeping" />);
    const chip = container.querySelector('span');
    expect(chip).toHaveTextContent('Sleeping');
  });

  it('renders stopped status with red indicator', () => {
    const { container } = render(<AppCardStatus status="stopped" />);
    const chip = container.querySelector('span');
    expect(chip).toHaveTextContent('Stopped');
  });
});

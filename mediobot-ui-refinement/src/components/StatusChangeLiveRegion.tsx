/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Screen Reader Status Change Live Region (R6.2)
 * Provides an accessible live region for screen readers to announce execution
 * and status updates without visual disruption.
 */

import React from 'react';

export interface StatusChangeLiveRegionProps {
  readonly message: string;
  readonly role?: 'status' | 'alert';
  readonly ariaLive?: 'polite' | 'assertive';
}

export const StatusChangeLiveRegion: React.FC<StatusChangeLiveRegionProps> = ({
  message,
  role = 'status',
  ariaLive = 'polite',
}) => {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      className="sr-only"
      data-testid="status-live-region"
    >
      {message}
    </div>
  );
};

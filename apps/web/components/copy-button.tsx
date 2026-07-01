'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      variant="secondary"
      className={className}
      onClick={copyValue}
      disabled={!value}
      aria-label={label}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

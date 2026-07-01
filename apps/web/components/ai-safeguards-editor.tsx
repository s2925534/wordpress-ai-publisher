'use client';

import { useMemo } from 'react';

import { defaultAiSafeguard, normalizeAiSafeguards, type AiSafeguard } from '@/lib/ai-safeguards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  safeguards: AiSafeguard[];
  selectedId: string;
  onChange: (next: { safeguards: AiSafeguard[]; selectedId: string }) => void;
};

export function AiSafeguardsEditor({ safeguards, selectedId, onChange }: Props) {
  const normalizedSafeguards = useMemo(() => normalizeAiSafeguards(safeguards), [safeguards]);
  const selectedSafeguard =
    normalizedSafeguards.find((item) => item.id === selectedId) ?? normalizedSafeguards[0] ?? defaultAiSafeguard;
  const isReadonly = selectedSafeguard.readonly;

  function updateSelected(patch: Partial<AiSafeguard>) {
    if (isReadonly) {
      return;
    }

    onChange({
      selectedId: selectedSafeguard.id,
      safeguards: normalizedSafeguards.map((item) =>
        item.id === selectedSafeguard.id ? { ...item, ...patch, readonly: false } : item
      )
    });
  }

  function addCustomSafeguard() {
    const id = `custom-${Date.now()}`;
    const nextSafeguard: AiSafeguard = {
      id,
      name: 'Custom safeguard',
      readonly: false,
      guidelines:
        'Treat the prompt as an instruction when it asks to write, create, draft, or generate content. Produce the requested content directly. Keep it original, safe, and suitable for the selected publishing context.'
    };

    onChange({
      selectedId: id,
      safeguards: normalizeAiSafeguards([...normalizedSafeguards, nextSafeguard])
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="ai-safeguard-select">
          Active safeguard
        </label>
        <select
          id="ai-safeguard-select"
          value={selectedSafeguard.id}
          onChange={(event) =>
            onChange({
              safeguards: normalizedSafeguards,
              selectedId: event.target.value
            })
          }
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          {normalizedSafeguards.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.readonly ? ' (default)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="ai-safeguard-name">
          Safeguard name
        </label>
        <Input
          id="ai-safeguard-name"
          value={selectedSafeguard.name}
          onChange={(event) => updateSelected({ name: event.target.value })}
          disabled={isReadonly}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="ai-safeguard-guidelines">
          Generation safeguards and guidelines
        </label>
        <Textarea
          id="ai-safeguard-guidelines"
          value={selectedSafeguard.guidelines}
          onChange={(event) => updateSelected({ guidelines: event.target.value })}
          disabled={isReadonly}
          className="min-h-48"
        />
        <p className={isReadonly ? 'text-xs font-semibold text-slate-600' : 'text-xs text-slate-500'}>
          {isReadonly
            ? 'The default safeguard is built in and cannot be edited. Create a custom safeguard for different post types.'
            : 'Custom safeguards are saved with your configuration and used during generation.'}
        </p>
      </div>

      <Button variant="secondary" onClick={addCustomSafeguard}>
        Create custom safeguard
      </Button>
    </div>
  );
}

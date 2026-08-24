'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import {
  CHANNEL_COLUMNS,
  CHANNEL_LABELS,
  TYPE_LABELS,
  preferencesSchema,
  type ChannelColumn,
  type Preference,
} from './notification-contracts';

/**
 * The preferences table — **In-app and Push. There is no Email column.**
 *
 * Not greyed out, not "coming soon", and not omitted by a component that could
 * have rendered one: the columns come from `CHANNEL_COLUMNS`, which is a
 * two-entry tuple, and `Preference.channel` is typed from the same tuple. There
 * is no value this component could render a third column *from*. `09` asks for
 * the promise; this is the strongest form it takes in a UI.
 *
 * Saving sends only the row that changed. Sending the whole matrix on every
 * toggle would make two people editing on two devices overwrite each other with
 * settings neither of them touched.
 */
export function PreferencesTable() {
  const [preferences, setPreferences] = useState<readonly Preference[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch('/api/v1/notifications/preferences', { schema: preferencesSchema })
      .then((result) => { setPreferences(result.preferences); })
      .catch(() => undefined);
  }, []);

  const types = [...new Set(preferences.map((preference) => preference.type))];

  const find = (type: string, channel: ChannelColumn): Preference | undefined =>
    preferences.find(
      (preference) => preference.type === type && preference.channel === channel,
    );

  const toggle = (preference: Preference): void => {
    const key = `${preference.type}:${preference.channel}`;

    setSaving(key);

    void apiFetch('/api/v1/notifications/preferences', {
      method: 'PUT',
      schema: preferencesSchema,
      body: { updates: [{ ...preference, enabled: !preference.enabled }] },
    })
      .then((result) => { setPreferences(result.preferences); })
      // The checkbox does not move on a failure. An optimistic toggle that
      // silently reverted would tell the learner their setting had saved.
      .catch(() => undefined)
      .finally(() => { setSaving(null); });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
      <caption className="sr-only">
        Which notifications you receive, in the app and as a push
      </caption>

      <thead>
        <tr>
          <th scope="col" className="py-2 text-left font-medium">
            Notification
          </th>
          {CHANNEL_COLUMNS.map((channel) => (
            <th key={channel} scope="col" className="py-2 text-left font-medium">
              {CHANNEL_LABELS[channel]}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {types.map((type) => (
          <tr key={type} className="border-t border-neutral-200">
            <th scope="row" className="py-2 text-left font-normal">
              {TYPE_LABELS[type] ?? type}
            </th>

            {CHANNEL_COLUMNS.map((channel) => {
              const preference = find(type, channel);

              return (
                <td key={channel} className="py-2">
                  <input
                    type="checkbox"
                    checked={preference?.enabled ?? false}
                    disabled={preference === undefined || saving === `${type}:${channel}`}
                    aria-label={`${TYPE_LABELS[type] ?? type} — ${CHANNEL_LABELS[channel]}`}
                    onChange={() => {
                      if (preference !== undefined) {
                        toggle(preference);
                      }
                    }}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

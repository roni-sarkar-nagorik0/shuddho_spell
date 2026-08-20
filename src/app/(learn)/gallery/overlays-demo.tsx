'use client';

import { useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { ConfirmDialog } from '@/components/overlays/confirm-dialog';
import { Drawer } from '@/components/overlays/drawer';
import { Popover } from '@/components/overlays/popover';
import { useToast } from '@/components/overlays/toast';

const BUTTON = 'h-8 rounded-control border border-primary-900 px-3 text-primary-900';

export function PopoverDemo(): ReactElement {
  return (
    <Popover align="left" trigger={<Glyph name="bell" size={16} />} triggerLabel="Open the popover">
      <p className="font-medium text-primary-900">Non-modal</p>
      <p className="mt-1 text-muted">
        Escape closes it, clicking outside closes it, and tabbing past the last control closes it
        rather than trapping.
      </p>
      <button className={`${BUTTON} mt-3`} type="button">
        A focusable control
      </button>
    </Popover>
  );
}

export function DrawerDemo(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={BUTTON} onClick={() => { setOpen(true); }} type="button">
        Open the drawer
      </button>
      <Drawer onClose={() => { setOpen(false); }} open={open} title="Word detail">
        <p className="text-neutral-700">
          Modal: Tab cycles inside, Escape closes, and focus returns to the button that opened it.
        </p>
        <button className={`${BUTTON} mt-4`} type="button">
          First control
        </button>
        <button className={`${BUTTON} ml-2 mt-4`} type="button">
          Last control
        </button>
      </Drawer>
    </>
  );
}

export function ConfirmDemo(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={BUTTON} onClick={() => { setOpen(true); }} type="button">
        Submit the exam
      </button>
      <ConfirmDialog
        body="Twelve questions are still blank. Submitting ends the attempt and it cannot be reopened."
        cancelLabel="Keep working"
        confirmLabel="Submit anyway"
        destructive
        onCancel={() => { setOpen(false); }}
        onConfirm={() => { setOpen(false); }}
        open={open}
        title="Submit with blanks?"
      />
    </>
  );
}

export function ToastDemo(): ReactElement {
  const toast = useToast();

  return (
    <span className="flex flex-wrap gap-2">
      <button
        className={BUTTON}
        onClick={() => {
          toast.show({ severity: 'success', title: 'Day 8 complete', body: '18 of 20 correct.' });
        }}
        type="button"
      >
        Success
      </button>
      <button
        className={BUTTON}
        onClick={() => {
          toast.show({ severity: 'warning', title: 'Five minutes left', body: 'Section B is open.' });
        }}
        type="button"
      >
        Warning
      </button>
      <button
        className={BUTTON}
        onClick={() => {
          toast.show({ severity: 'critical', title: 'Answer not saved', body: 'Check your connection.' });
        }}
        type="button"
      >
        Critical
      </button>
    </span>
  );
}

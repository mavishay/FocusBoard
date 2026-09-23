// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notes } from '../../src/components/Notes';

const mockNotes = [
  {
    id: 'note-1',
    title: 'Pinned idea',
    content: 'Remember to follow up with the team.',
    tags: ['work'],
    source: 'manual' as const,
    pinned: true,
    createdAt: '2026-09-23T08:00:00.000Z',
    updatedAt: '2026-09-23T08:00:00.000Z',
  },
  {
    id: 'note-2',
    title: 'AI insight',
    content: 'Generated summary from chat.',
    tags: ['ai'],
    source: 'agent' as const,
    pinned: false,
    createdAt: '2026-09-23T09:00:00.000Z',
    updatedAt: '2026-09-23T09:00:00.000Z',
  },
];

const mockNotesApi = {
  list: vi.fn().mockResolvedValue(mockNotes),
  create: vi.fn().mockResolvedValue(mockNotes[0]),
  update: vi.fn().mockResolvedValue({ ...mockNotes[0], pinned: false }),
  delete: vi.fn().mockResolvedValue({ success: true }),
  getAllTags: vi.fn().mockResolvedValue(['ai', 'work']),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(window, {
    electronAPI: {
      notes: mockNotesApi,
    },
  });
});

describe('Notes page', () => {
  it('renders notes, tag filters, and AI badge', async () => {
    render(<Notes />);

    expect(await screen.findByText('Pinned idea')).toBeInTheDocument();
    expect(screen.getByText('AI insight')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getAllByText('work').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ai').length).toBeGreaterThan(0);
  });

  it('filters notes by search input', async () => {
    const user = userEvent.setup();
    render(<Notes />);

    await screen.findByText('Pinned idea');
    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, 'insight');

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith({
        search: 'insight',
        tag: undefined,
      });
    });
  });

  it('opens create dialog from New note button', async () => {
    const user = userEvent.setup();
    render(<Notes />);

    await screen.findByText('Pinned idea');
    await user.click(screen.getByRole('button', { name: 'New note' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });
});

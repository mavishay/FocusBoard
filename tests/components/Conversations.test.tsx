// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Conversations } from '../../src/components/Conversations';

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Task planning',
    createdAt: '2026-09-23T08:00:00.000Z',
    updatedAt: '2026-09-23T08:00:00.000Z',
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user' as const,
    content: 'Show my tasks',
    actions: [],
    createdAt: '2026-09-23T08:00:00.000Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant' as const,
    content: 'Here are your open tasks.',
    actions: [{ type: 'list_tasks', result: [] }],
    createdAt: '2026-09-23T08:01:00.000Z',
  },
];

const mockChatApi = {
  listConversations: vi.fn().mockResolvedValue(mockConversations),
  createConversation: vi.fn().mockResolvedValue({
    id: 'conv-new',
    title: 'New conversation',
    createdAt: '2026-09-23T09:00:00.000Z',
    updatedAt: '2026-09-23T09:00:00.000Z',
  }),
  deleteConversation: vi.fn().mockResolvedValue({ success: true }),
  getMessages: vi.fn().mockResolvedValue(mockMessages),
  sendMessage: vi.fn().mockResolvedValue({
    assistantMessage: mockMessages[1],
    conversation: mockConversations[0],
  }),
};

const mockAiConsentApi = {
  getSettings: vi.fn().mockResolvedValue({
    consented: true,
    policyVersion: '1.0',
    consentedAt: '2026-09-23T00:00:00.000Z',
    revokedAt: null,
  }),
};

const mockApiKeyApi = {
  list: vi.fn().mockResolvedValue([{ id: 'key-1', provider: 'openai', label: 'Test' }]),
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockChatApi.listConversations.mockResolvedValue(mockConversations);
  mockChatApi.getMessages.mockResolvedValue(mockMessages);
  mockChatApi.sendMessage.mockResolvedValue({
    assistantMessage: mockMessages[1],
    conversation: mockConversations[0],
  });
  mockAiConsentApi.getSettings.mockResolvedValue({
    consented: true,
    policyVersion: '1.0',
    consentedAt: '2026-09-23T00:00:00.000Z',
    revokedAt: null,
  });
  mockApiKeyApi.list.mockResolvedValue([
    { id: 'key-1', provider: 'openai', label: 'Test' },
  ]);
  Object.assign(window, {
    electronAPI: {
      chat: mockChatApi,
      aiConsent: mockAiConsentApi,
      apikey: mockApiKeyApi,
    },
  });
});

function renderConversations() {
  return render(
    <MemoryRouter>
      <Conversations />
    </MemoryRouter>
  );
}

describe('Conversations page', () => {
  it('renders conversation list and messages', async () => {
    renderConversations();

    expect(await screen.findByText('Task planning')).toBeInTheDocument();
    expect(screen.getByText('Show my tasks')).toBeInTheDocument();
    expect(screen.getByText('Here are your open tasks.')).toBeInTheDocument();
  });

  it('shows consent required banner when AI consent is missing', async () => {
    mockAiConsentApi.getSettings.mockResolvedValue({
      consented: false,
      policyVersion: '1.0',
      consentedAt: null,
      revokedAt: null,
    });

    renderConversations();

    expect(await screen.findByText('AI consent required')).toBeInTheDocument();
  });

  it('shows API key required banner when no keys configured', async () => {
    mockApiKeyApi.list.mockResolvedValue([]);

    renderConversations();

    expect(await screen.findByText('API key required')).toBeInTheDocument();
  });

  it('sends a message when user submits input', async () => {
    const user = userEvent.setup();
    renderConversations();

    await screen.findByText('Show my tasks');

    const input = screen.getByPlaceholderText('Ask about emails, tasks, or notes...');
    await user.type(input, 'List my emails');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(mockChatApi.sendMessage).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        content: 'List my emails',
      });
    });
  });
});

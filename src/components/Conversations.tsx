import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions: Array<{
    type: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: string;
  }>;
  createdAt: string;
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<
    'consent_required' | 'api_key_required' | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const list = await window.electronAPI.chat.listConversations();
      setConversations(list);
      setSelectedId((current) => current ?? (list.length > 0 ? list[0].id : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      const msgs = await window.electronAPI.chat.getMessages({ conversationId });
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  }, []);

  const checkSetup = useCallback(async () => {
    try {
      const [consent, keys] = await Promise.all([
        window.electronAPI.aiConsent.getSettings(),
        window.electronAPI.apikey.list(),
      ]);
      if (!consent.consented) {
        setSetupError('consent_required');
      } else if (keys.length === 0) {
        setSetupError('api_key_required');
      } else {
        setSetupError(null);
      }
    } catch {
      // Non-fatal — send will surface errors
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    void checkSetup();
  }, [loadConversations, checkSetup]);

  useEffect(() => {
    if (selectedId) {
      void loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      setError(null);
      const conversation = await window.electronAPI.chat.createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setSelectedId(conversation.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      setError(null);
      await window.electronAPI.chat.deleteConversation({ conversationId: id });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    let conversationId = selectedId;
    if (!conversationId) {
      try {
        const conversation = await window.electronAPI.chat.createConversation();
        setConversations((prev) => [conversation, ...prev]);
        conversationId = conversation.id;
        setSelectedId(conversationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create conversation');
        return;
      }
    }

    setInput('');
    setSending(true);
    setError(null);

    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      actions: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const result = await window.electronAPI.chat.sendMessage({
        conversationId,
        content,
      });

      if (result.error === 'consent_required') {
        setSetupError('consent_required');
      } else if (result.error === 'api_key_required') {
        setSetupError('api_key_required');
      }

      if (result.conversation) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === result.conversation!.id ? result.conversation! : c
          )
        );
      }

      await loadMessages(conversationId);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="size-4" />
            Conversations
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleNewConversation()}
            aria-label="New conversation"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground p-2">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No conversations yet
            </p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors',
                  selectedId === conversation.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <button
                  type="button"
                  className="flex-1 text-left truncate py-1"
                  onClick={() => setSelectedId(conversation.id)}
                >
                  {conversation.title}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => void handleDeleteConversation(conversation.id)}
                  aria-label={`Delete ${conversation.title}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {setupError && (
          <div
            className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
            role="alert"
          >
            {setupError === 'consent_required' ? (
              <AlertCircle className="size-5 shrink-0 text-amber-600" />
            ) : (
              <KeyRound className="size-5 shrink-0 text-amber-600" />
            )}
            <div className="space-y-1">
              {setupError === 'consent_required' ? (
                <>
                  <p className="font-medium">AI consent required</p>
                  <p className="text-muted-foreground">
                    Enable AI features in{' '}
                    <Link to="/settings" className="underline hover:text-foreground">
                      Settings
                    </Link>{' '}
                    to use the chat assistant.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">API key required</p>
                  <p className="text-muted-foreground">
                    Add an OpenAI or Anthropic API key in{' '}
                    <Link to="/settings" className="underline hover:text-foreground">
                      Settings
                    </Link>{' '}
                    to use the chat assistant.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedId ? (
            <Card className="max-w-lg mx-auto mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-5" />
                  AI Chat Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about your emails, tasks, and notes. Create notes
                  and look up data using natural language.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void handleNewConversation()}>
                  <Plus className="size-4 mr-2" />
                  Start a conversation
                </Button>
              </CardContent>
            </Card>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="size-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {selectedConversation?.title ?? 'New conversation'}
              </p>
              <p className="text-sm mt-1 max-w-md">
                Try &ldquo;Show my urgent emails&rdquo;, &ldquo;List my open
                tasks&rdquo;, or &ldquo;Create a note about today&apos;s meeting&rdquo;
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 max-w-3xl',
                  message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                {message.role === 'assistant' && (
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="size-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2.5 text-sm max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      {message.actions.map((action, i) => (
                        <div key={i}>
                          {action.error
                            ? `${action.type}: ${action.error}`
                            : `${action.type} completed`}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] opacity-60 mt-1">
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about emails, tasks, or notes..."
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDueDate } from '@/lib/task-utils';

type WizardStep = 'loading' | 'empty' | 'consent' | 'review' | 'suggestions' | 'done';

interface TaskPlannerWizardProps {
  onClose: () => void;
  onApplied?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  reschedule: 'Reschedule',
  complete: 'Complete',
  dismiss: 'Dismiss',
  keep: 'Keep',
};

export function TaskPlannerWizard({ onClose, onApplied }: TaskPlannerWizardProps) {
  const [step, setStep] = useState<WizardStep>('loading');
  const [openTasks, setOpenTasks] = useState<Array<{
    id: string;
    title: string;
    source: 'Google Tasks' | 'TickTick';
    dueDate: string | null;
    listTitle: string;
  }>>([]);
  const [session, setSession] = useState<TaskPlannerSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ applied: number; failed: string[] } | null>(null);

  const init = useCallback(async () => {
    try {
      setError(null);
      setStep('loading');
      const [tasks, consent] = await Promise.all([
        window.electronAPI.taskPlanner.listOpenTasks(),
        window.electronAPI.aiConsent.getSettings(),
      ]);

      setOpenTasks(tasks);

      if (tasks.length === 0) {
        setStep('empty');
        return;
      }

      if (!consent.consented) {
        setStep('consent');
        return;
      }

      const newSession = await window.electronAPI.taskPlanner.createSession();
      setSession(newSession);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setStep('review');
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleEnableConsent = async () => {
    const confirmed = window.confirm(
      'Enable AI features? Task titles and workload context will be sent to your configured LLM provider for planning suggestions.',
    );
    if (!confirmed) return;

    await window.electronAPI.aiConsent.setConsent(true);
    await init();
  };

  const handleGenerate = async () => {
    if (!session) return;
    try {
      setGenerating(true);
      setError(null);
      const updated = await window.electronAPI.taskPlanner.generateSuggestions(session.id);
      setSession(updated);
      setStep('suggestions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSuggestion = async (suggestionId: string, accepted: boolean) => {
    if (!session) return;
    await window.electronAPI.taskPlanner.updateSuggestion({
      sessionId: session.id,
      suggestionId,
      accepted,
    });
    const updated = await window.electronAPI.taskPlanner.getSession(session.id);
    setSession(updated);
  };

  const handleAcceptAll = async () => {
    if (!session) return;
    const updated = await window.electronAPI.taskPlanner.acceptAll(session.id);
    setSession(updated);
  };

  const handleApply = async () => {
    if (!session) return;
    try {
      setApplying(true);
      setError(null);
      const result = await window.electronAPI.taskPlanner.applySuggestions(session.id);
      setApplyResult(result);
      setStep('done');
      onApplied?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestions');
    } finally {
      setApplying(false);
    }
  };

  const actionableSuggestions = session?.suggestions.filter((s) => s.action !== 'keep') ?? [];
  const acceptedCount = actionableSuggestions.filter((s) => s.accepted === true).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        role="dialog"
        aria-labelledby="task-planner-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 id="task-planner-title" className="text-lg font-semibold">Task Planner</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 'loading' && (
            <p className="text-muted-foreground text-sm">Loading open tasks...</p>
          )}

          {step === 'empty' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3 opacity-50">🎯</div>
              <p className="text-foreground font-medium mb-1">No open tasks</p>
              <p className="text-muted-foreground text-sm">
                Connect Google Tasks or TickTick and add tasks to use the planner.
              </p>
            </div>
          )}

          {step === 'consent' && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <p className="text-sm text-muted-foreground max-w-md">
                AI consent is required to generate task planning suggestions. Your task titles and workload
                summary will be sent to your configured LLM provider.
              </p>
              <Button onClick={handleEnableConsent}>Enable AI Features</Button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {openTasks.length} open task{openTasks.length === 1 ? '' : 's'} will be analyzed for planning suggestions.
              </p>
              <ul className="space-y-2 max-h-64 overflow-auto">
                {openTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border text-sm">
                    <span className="truncate">{task.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 'suggestions' && session && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {acceptedCount} of {actionableSuggestions.length} actionable suggestions accepted
                </p>
                {actionableSuggestions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                    Accept all
                  </Button>
                )}
              </div>
              <ul className="space-y-2">
                {session.suggestions.map((suggestion) => (
                  <li
                    key={suggestion.id}
                    className={`p-3 rounded-lg border text-sm ${
                      suggestion.action === 'keep'
                        ? 'border-border/50 opacity-60'
                        : suggestion.accepted === true
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : suggestion.accepted === false
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium">{suggestion.taskTitle}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary shrink-0">
                        {ACTION_LABELS[suggestion.action]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{suggestion.reasoning}</p>
                    {suggestion.action === 'reschedule' && suggestion.suggestedDueDate && (
                      <p className="text-xs mb-2">
                        New due date: <strong>{suggestion.suggestedDueDate}</strong>
                      </p>
                    )}
                    {suggestion.action !== 'keep' && (
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant={suggestion.accepted === true ? 'default' : 'outline'}
                          onClick={() => handleToggleSuggestion(suggestion.id, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="xs"
                          variant={suggestion.accepted === false ? 'destructive' : 'outline'}
                          onClick={() => handleToggleSuggestion(suggestion.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 'done' && applyResult && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-medium">Applied {applyResult.applied} suggestion{applyResult.applied === 1 ? '' : 's'}</p>
              {applyResult.failed.length > 0 && (
                <div className="text-sm text-destructive mt-2">
                  <p>{applyResult.failed.length} failed:</p>
                  <ul className="text-left mt-1">
                    {applyResult.failed.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Suggestions'}
              </Button>
            </>
          )}
          {step === 'suggestions' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleApply} disabled={applying || acceptedCount === 0}>
                {applying ? 'Applying...' : `Apply ${acceptedCount} Accepted`}
              </Button>
            </>
          )}
          {(step === 'empty' || step === 'consent' || step === 'done') && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}

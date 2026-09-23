import { describe, it, expect } from 'vitest';
import {
  CLASSIFICATION_GET_EMAILS_MAX_LIMIT,
  GetEmailsSchema,
} from '../../../electron/main/ipc/classification-handlers';
import { CLASSIFICATION_GET_EMAILS_MAX_LIMIT as RENDERER_GET_EMAILS_MAX_LIMIT } from '../../../src/lib/classification-constants';

describe('Classification IPC Zod schemas', () => {
  describe('GetEmailsSchema', () => {
    it('accepts limit at schema maximum', () => {
      const result = GetEmailsSchema.safeParse({
        limit: CLASSIFICATION_GET_EMAILS_MAX_LIMIT,
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty payload', () => {
      const result = GetEmailsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects limit below 1', () => {
      const result = GetEmailsSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects limit above schema maximum', () => {
      const result = GetEmailsSchema.safeParse({
        limit: CLASSIFICATION_GET_EMAILS_MAX_LIMIT + 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects limit 500 used by daily-status callers before fix', () => {
      const result = GetEmailsSchema.safeParse({ limit: 500 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer limit', () => {
      const result = GetEmailsSchema.safeParse({ limit: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  it('keeps renderer and IPC max limit constants aligned', () => {
    expect(RENDERER_GET_EMAILS_MAX_LIMIT).toBe(CLASSIFICATION_GET_EMAILS_MAX_LIMIT);
  });
});

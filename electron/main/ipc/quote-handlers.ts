import type Database from 'better-sqlite3';
import { QuoteService } from '../services/quote-service';

export function registerQuoteHandlers(
  ipcMain: typeof import('electron').ipcMain,
  db: Database.Database
): void {
  const quoteService = new QuoteService(db);

  ipcMain.handle('quote:getToday', async () => {
    return quoteService.getToday();
  });

  ipcMain.handle('quote:refresh', async () => {
    return quoteService.refresh();
  });
}

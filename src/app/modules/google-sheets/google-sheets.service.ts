import { google, sheets_v4 } from 'googleapis';
import config from '../../config';
import { saleService } from '../sale/sale.service';
import { ISheetSaleRow } from './google-sheets.interface';
import logger from '../../utils/logger';

let sheetsClient: sheets_v4.Sheets | null = null;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const isConfigured = (): boolean => {
  return !!(
    config.googleSheets.credentials && config.googleSheets.spreadsheetId
  );
};

const getClient = (): sheets_v4.Sheets | null => {
  if (!isConfigured()) return null;

  if (sheetsClient) return sheetsClient;

  try {
    const credentials = JSON.parse(config.googleSheets.credentials);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    logger.error('Failed to initialize Google Sheets client:', error);
    return null;
  }
};

const appendSaleRow = async (row: ISheetSaleRow): Promise<boolean> => {
  const client = getClient();
  if (!client) return false;

  try {
    await client.spreadsheets.values.append({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [row.date, row.userName, row.telegramId, row.productName, row.price],
        ],
      },
    });

    return true;
  } catch (error) {
    logger.error('Failed to append sale to Google Sheets:', error);
    return false;
  }
};

const syncUnsyncedSales = async (): Promise<void> => {
  if (!isConfigured()) return;

  try {
    const unsyncedSales = await saleService.getUnsyncedSales(50);

    if (unsyncedSales.length === 0) return;

    const client = getClient();
    if (!client) return;

    const rows = unsyncedSales.map(sale => [
      sale.createdAt.toISOString(),
      sale.user.name,
      sale.user.telegramId,
      sale.productName,
      Number(sale.price),
    ]);

    await client.spreadsheets.values.append({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    const saleIds = unsyncedSales.map(s => s.id);
    await saleService.markSalesSynced(saleIds);

    logger.info(`Synced ${saleIds.length} sales to Google Sheets`);
  } catch (error) {
    logger.error('Google Sheets sync failed:', error);
  }
};

const startPeriodicSync = (): void => {
  if (!isConfigured()) {
    logger.info('Google Sheets not configured, skipping periodic sync');
    return;
  }

  if (syncIntervalId) return;

  syncIntervalId = setInterval(syncUnsyncedSales, SYNC_INTERVAL_MS);
  logger.info(
    `Google Sheets periodic sync started (every ${SYNC_INTERVAL_MS / 1000}s)`,
  );
};

const stopPeriodicSync = (): void => {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    logger.info('Google Sheets periodic sync stopped');
  }
};

export const googleSheetsService = {
  isConfigured,
  appendSaleRow,
  syncUnsyncedSales,
  startPeriodicSync,
  stopPeriodicSync,
};

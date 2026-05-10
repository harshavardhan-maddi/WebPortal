import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// These should be set in .env.local
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export async function appendToGoogleSheet(data: any) {
  if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.warn("Google Sheets credentials not found. Skipping sync.");
    return;
  }

  try {
    const serviceAccountAuth = new JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // Assuming first sheet
    
    await sheet.addRow({
      'Student Name': data.name,
      'Email': data.email,
      'Roll Number': data.rollNumber,
      'College': data.college,
      'Mobile': data.mobile,
      'Domain': data.domain,
      'Score': `${data.score}%`,
      'Time Taken': `${Math.floor(data.timeTaken / 60)}m ${data.timeTaken % 60}s`,
      'Submission Time': new Date().toLocaleString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error syncing to Google Sheets:", error);
    return { success: false, error };
  }
}

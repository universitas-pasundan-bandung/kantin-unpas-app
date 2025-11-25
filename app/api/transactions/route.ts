import { NextRequest, NextResponse } from 'next/server';
import { saveTransactionToSheet, getTransactionsFromSheet } from '@/lib/googleScript';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptUrl, transaction } = body;

    if (!scriptUrl) {
      return NextResponse.json(
        { success: false, error: 'Spreadsheet URL is required' },
        { status: 400 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction data is required' },
        { status: 400 }
      );
    }

    const result = await saveTransactionToSheet(scriptUrl, transaction, true); // true = server-side

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction saved successfully',
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptUrl = searchParams.get('scriptUrl');

    if (!scriptUrl) {
      return NextResponse.json(
        { success: false, error: 'Spreadsheet URL is required' },
        { status: 400 }
      );
    }

    const result = await getTransactionsFromSheet(scriptUrl, true); // true = server-side

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Get transactions array
    const transactions = result.data?.data || [];

    // Sort by createdAt (newest first)
    const sortedTransactions = transactions.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    return NextResponse.json({
      success: true,
      data: sortedTransactions
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


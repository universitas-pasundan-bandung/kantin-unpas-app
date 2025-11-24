const SUPER_ADMIN_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '';

export interface ApiResponse<T> {
  success?: boolean;
  data?: {
    data: T[];
  };
  error?: string;
  message?: string;
}

export async function fetchFromGoogleScript<T>(
  scriptUrl: string,
  sheetName: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<ApiResponse<T>> {
  try {
    if (!scriptUrl) {
      return {
        success: false,
        error: 'Google Script URL is not configured'
      };
    }

    // Use Next.js API route as proxy to avoid CORS issues
    const apiUrl = `/api/google-script?sheet=${encodeURIComponent(sheetName)}&scriptUrl=${encodeURIComponent(scriptUrl)}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' && data) {
      options.body = JSON.stringify(data);
    }

    let response: Response;
    let text: string = '';
    
    try {
      response = await fetch(apiUrl, options);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText.substring(0, 100) : ''}`
        };
      }
      
      text = await response.text();
      
      // Check if response is HTML (redirect page) - Google Apps Script sometimes returns HTML redirect
      if (text.trim().startsWith('<') || text.includes('<HTML>') || text.includes('<!DOCTYPE')) {
        return {
          success: false,
          error: 'Google Script returned HTML instead of JSON. Please check the script deployment settings (must be deployed as web app with CORS enabled).'
        };
      }
      
      // Try to parse as JSON
      const result = JSON.parse(text);
      
      // Check for error in response
      if (result.error) {
        return {
          success: false,
          error: result.error
        };
      }
      
      // Check if response has data field (for GET requests)
      if (result.data !== undefined) {
        return {
          success: true,
          data: result
        };
      }
      
      // Check if response has success field (for POST requests)
      if (result.success === true) {
        return {
          success: true,
          data: result.data ? result : undefined
        };
      }
      
      if (result.success === false) {
        return {
          success: false,
          error: result.error || 'Request failed'
        };
      }
      
      return {
        success: false,
        error: 'Invalid response format from Google Script'
      };
    } catch (fetchError) {
      // Network error or CORS error
      if (fetchError instanceof TypeError) {
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('CORS')) {
          return {
            success: false,
            error: 'CORS error: Please ensure the Google Apps Script is deployed as a web app with "Execute as: Me" and "Who has access: Anyone"'
          };
        }
      }
      
      // JSON parse error
      if (fetchError instanceof SyntaxError) {
        return {
          success: false,
          error: `Invalid JSON response: ${text ? text.substring(0, 200) : 'No response'}`
        };
      }
      
      return {
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error occurred'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function saveTransactionToSheet(scriptUrl: string, transaction: any, isServerSide = false) {
  // If called from server-side, use direct fetch to Google Script
  if (isServerSide) {
    try {
      if (!scriptUrl) {
        return {
          success: false,
          error: 'Google Script URL is not configured'
        };
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const url = `${scriptUrl}?sheet=${encodeURIComponent('Pesanan')}&t=${timestamp}&r=${randomId}&_cb=${Date.now()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          data: transaction
        }),
        redirect: 'follow',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText.substring(0, 100) : ''}`
        };
      }

      const text = await response.text();
      
      // Check if response is HTML (redirect page)
      if (text.trim().startsWith('<') || text.includes('<HTML>') || text.includes('<!DOCTYPE')) {
        return {
          success: false,
          error: 'Google Script returned HTML instead of JSON. Please check the script deployment settings.'
        };
      }

      const result = JSON.parse(text);
      
      if (result.error) {
        return {
          success: false,
          error: result.error
        };
      }

      if (result.success === true) {
        return {
          success: true,
          data: result
        };
      }

      return {
        success: false,
        error: 'Invalid response format from Google Script'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Client-side: use API route proxy
  return fetchFromGoogleScript(scriptUrl, 'Pesanan', 'POST', {
    action: 'create',
    data: transaction
  });
}

export async function getTransactionsFromSheet(scriptUrl: string, isServerSide = false) {
  // If called from server-side, use direct fetch to Google Script
  if (isServerSide) {
    try {
      if (!scriptUrl) {
        return {
          success: false,
          error: 'Google Script URL is not configured'
        };
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const url = `${scriptUrl}?sheet=${encodeURIComponent('Pesanan')}&t=${timestamp}&r=${randomId}&_cb=${Date.now()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText.substring(0, 100) : ''}`
        };
      }

      const text = await response.text();
      
      // Check if response is HTML (redirect page)
      if (text.trim().startsWith('<') || text.includes('<HTML>') || text.includes('<!DOCTYPE')) {
        return {
          success: false,
          error: 'Google Script returned HTML instead of JSON. Please check the script deployment settings.'
        };
      }

      const result = JSON.parse(text);
      
      if (result.error) {
        return {
          success: false,
          error: result.error
        };
      }

      if (result.data !== undefined) {
        return {
          success: true,
          data: result
        };
      }

      return {
        success: false,
        error: 'Invalid response format from Google Script'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Client-side: use API route proxy
  return fetchFromGoogleScript(scriptUrl, 'Pesanan', 'GET');
}

export async function saveKantinToSuperAdminSheet(kantin: any) {
  if (!SUPER_ADMIN_SCRIPT_URL) {
    return {
      success: false,
      error: 'Super Admin Google Script URL is not configured'
    };
  }
  return fetchFromGoogleScript(SUPER_ADMIN_SCRIPT_URL, 'AkunKantin', 'POST', {
    action: 'create',
    data: kantin
  });
}

export async function getKantinsFromSuperAdminSheet() {
  if (!SUPER_ADMIN_SCRIPT_URL) {
    return {
      success: false,
      error: 'Super Admin Google Script URL is not configured',
      data: { data: [] }
    };
  }
  return fetchFromGoogleScript(SUPER_ADMIN_SCRIPT_URL, 'AkunKantin', 'GET');
}

export async function updateKantinInSuperAdminSheet(kantinId: string, kantin: any) {
  if (!SUPER_ADMIN_SCRIPT_URL) {
    return {
      success: false,
      error: 'Super Admin Google Script URL is not configured'
    };
  }
  return fetchFromGoogleScript(SUPER_ADMIN_SCRIPT_URL, 'AkunKantin', 'POST', {
    action: 'update',
    id: kantinId,
    data: kantin
  });
}

export async function deleteKantinFromSuperAdminSheet(kantinId: string) {
  if (!SUPER_ADMIN_SCRIPT_URL) {
    return {
      success: false,
      error: 'Super Admin Google Script URL is not configured'
    };
  }
  return fetchFromGoogleScript(SUPER_ADMIN_SCRIPT_URL, 'AkunKantin', 'POST', {
    action: 'delete',
    id: kantinId
  });
}


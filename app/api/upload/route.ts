import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const getAccessToken = async (request: NextRequest): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('google_access_token')?.value;
  if (token) return token;
  
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const accessTokenFromForm = formData.get('accessToken') as string | null;

    console.log('Upload request received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      hasAccessTokenFromForm: !!accessTokenFromForm,
    });

    let accessToken = await getAccessToken(request);
    
    if (!accessToken && accessTokenFromForm) {
      accessToken = accessTokenFromForm;
    }

    if (!accessToken) {
      console.error('No access token found');
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please connect your Google account.' },
        { status: 401 }
      );
    }

    if (!file) {
      console.error('No file provided in form data');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      console.error('File is empty');
      return NextResponse.json(
        { success: false, error: 'File is empty. Please select a valid image file.' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      console.error('File size exceeds limit:', file.size);
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Check file type - handle cases where file.type might be empty
    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const hasValidType = fileType && allowedTypes.includes(fileType);
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidType && !hasValidExtension) {
      console.error('Invalid file type:', { fileType, fileName });
      return NextResponse.json(
        { success: false, error: `Invalid file type. Only images are allowed (${allowedExtensions.join(', ')}). Received: ${fileType || 'unknown'}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      console.error('File buffer is empty');
      return NextResponse.json(
        { success: false, error: 'File is empty. Please select a valid image file.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const driveFileName = `ekantin_${timestamp}_${sanitizedFileName}`;

    // Use detected file type or default to image/png
    const contentType = fileType || 'image/png';

    console.log('Uploading to Google Drive:', {
      fileName: driveFileName,
      fileSize: buffer.length,
      contentType,
    });

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Google Drive upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
      });
      
      let errorMessage = `Google Drive API error: ${uploadResponse.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // If error is not JSON, use the text as is
        if (errorText) {
          errorMessage = errorText.substring(0, 200);
        }
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    let uploadData;
    try {
      uploadData = await uploadResponse.json();
    } catch (error) {
      console.error('Failed to parse upload response:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to parse Google Drive response' },
        { status: 500 }
      );
    }

    if (!uploadData.id) {
      console.error('Upload response missing file ID:', uploadData);
      return NextResponse.json(
        { success: false, error: 'Google Drive upload failed: No file ID returned' },
        { status: 500 }
      );
    }

    const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: driveFileName,
        description: 'E-Kantin UNPAS - Uploaded file',
      }),
    });

    if (!metadataResponse.ok) {
      console.warn('Failed to update file metadata, but upload succeeded');
    }

    let response;
    try {
      response = await metadataResponse.json();
    } catch (error) {
      // If metadata update fails, use the upload data
      response = uploadData;
      console.warn('Failed to parse metadata response, using upload data:', error);
    }

    if (!response.id) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to Google Drive' },
        { status: 500 }
      );
    }

    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${response.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    if (!permissionResponse.ok) {
      console.warn('Failed to make file public, but upload succeeded');
    }

    const fileUrl = `https://drive.google.com/uc?export=view&id=${response.id}`;

    return NextResponse.json({
      success: true,
      data: {
        id: response.id,
        name: response.name,
        url: fileUrl,
        webViewLink: `https://drive.google.com/file/d/${response.id}/view`,
        thumbnailLink: `https://drive.google.com/thumbnail?id=${response.id}&sz=w1000`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}


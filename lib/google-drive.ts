// lib/google-drive.ts

export interface DriveFile {
  id: string;
  name: string;
}

export const getDriveFiles = async (token: string): Promise<DriveFile[]> => {
  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=files(id%2Cname)',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) throw new Error('Failed to fetch files');
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching files:', error);
    return [];
  }
};

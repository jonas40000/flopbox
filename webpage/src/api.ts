const baseUrl = "https://d2088x53ljwykx.cloudfront.net";

export async function register(
  username: string,
  password: string,
  earlyAccessSecret: string
) {
  const response = await fetch(`${baseUrl}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, earlyAccessSecret }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to register");
  }
  return data.token;
}

export async function login(username: string, password: string) {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to login");
  }
  return data.token;
}

export async function getFiles(token: string) {
  const response = await fetch(`${baseUrl}/api/files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch files");
  }
  return data.files;
}

export async function getFileUrl(token: string, fileKey: string) {
  const response = await fetch(`${baseUrl}/api/files/${fileKey}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to get file URL");
  }
  return data.url;
}

export async function deleteFile(token: string, fileKey: string) {
  const response = await fetch(`${baseUrl}/api/files/${fileKey}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete file");
  }
  return data;
}

export async function getSignedUploadUrl(token: string, fileKey: string) {
  const response = await fetch(`${baseUrl}/api/files/${fileKey}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to get signed upload URL");
  }
  return data.url;
}

export async function uploadFileToS3(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to S3");
  }
}

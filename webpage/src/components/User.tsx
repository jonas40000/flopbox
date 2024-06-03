import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import {
  getFiles,
  getFileUrl,
  deleteFile,
  getSignedUploadUrl,
  uploadFileToS3,
} from "../api";
import flopboxImg from "../assets/flopbox.jpg";

const User: React.FC = () => {
  const { user, setUser } = useUser();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        if (user?.token) {
          const fetchedFiles = await getFiles(user.token);
          setFiles(fetchedFiles);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleDownload = async (fileKey: string) => {
    setError(null);
    try {
      if (user?.token) {
        const url = await getFileUrl(user.token, fileKey);
        window.open(url, "_blank");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (fileKey: string) => {
    setError(null);
    try {
      if (user?.token) {
        await deleteFile(user.token, fileKey);
        setFiles(files.filter((file) => file !== fileKey));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      if (user?.token) {
        const uploadUrl = await getSignedUploadUrl(
          user.token,
          selectedFile.name
        );
        await uploadFileToS3(uploadUrl, selectedFile);
        setSelectedFile(null);
        const fetchedFiles = await getFiles(user.token);
        setFiles(fetchedFiles);
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        paddingTop: 72,
      }}
    >
      <button
        onClick={handleLogout}
        style={{ position: "absolute", top: "10px", right: "10px" }}
      >
        Logout
      </button>
      <img src={flopboxImg} alt="Flopbox" width={400}></img>
      <h1 style={{ marginBottom: 60 }}>Hello, {user?.username}</h1>
      <label
        htmlFor="file-upload"
        style={{ cursor: "pointer", marginBottom: 30, display: "block" }}
      >
        <span
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "6px",
            borderRadius: "5px",
          }}
        >
          Choose file to upload
        </span>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </label>
      {selectedFile && (
        <>
          <p>{selectedFile.name}</p>
          <button onClick={handleUpload} style={{ marginBottom: "10px" }}>
            Upload
          </button>
        </>
      )}
      {uploadLoading && <p>Loading...</p>}
      {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}
      <h2>Your files</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {files.map((file, index) => (
          <li
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            {file}
            <button
              onClick={() => handleDownload(file)}
              style={{ marginLeft: "10px" }}
            >
              Download
            </button>
            <button
              onClick={() => handleDelete(file)}
              style={{ marginLeft: "10px" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default User;

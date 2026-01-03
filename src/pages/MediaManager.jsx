import React, { useState, useEffect } from 'react';
import api from '../services/api';

function MediaManager() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [totalStorage, setTotalStorage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      const response = await api.get('/media');
      setMediaFiles(response.data.mediaFiles);
      setTotalStorage(response.data.totalStorage);
      setLoading(false);
    } catch (err) {
      setError('Failed to load media files');
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, WebM, MOV, or MKV files.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setUploading(false);
      setUploadProgress(0);
      fetchMediaFiles();
      e.target.value = ''; // Reset input
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      await api.delete(`/media/${id}`);
      fetchMediaFiles();
    } catch (err) {
      setError('Failed to delete media file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="page-container"><div>Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Media Manager</h1>
        <p style={{ color: '#7f8c8d' }}>Upload and manage pre-recorded videos for streaming</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Storage Info */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>Total Storage Used:</strong> {formatFileSize(totalStorage)}
        </div>
        <div>
          <strong>Total Files:</strong> {mediaFiles.length}
        </div>
      </div>

      {/* Upload Section */}
      <div style={{
        border: '2px dashed #3498db',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        marginBottom: '2rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Upload Video</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
          Supported formats: MP4, WebM, MOV, MKV (Max 5GB)
        </p>

        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
          id="file-upload"
        />

        <label
          htmlFor="file-upload"
          className="btn btn-primary"
          style={{
            display: 'inline-block',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Choose File'}
        </label>

        {uploading && (
          <div style={{
            marginTop: '1rem',
            backgroundColor: '#ecf0f1',
            borderRadius: '4px',
            height: '24px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#3498db',
              height: '100%',
              width: `${uploadProgress}%`,
              transition: 'width 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.85rem'
            }}>
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>

      {/* Media Files List */}
      <h2 style={{ marginBottom: '1rem' }}>Your Videos ({mediaFiles.length})</h2>

      {mediaFiles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#7f8c8d'
        }}>
          <p>No videos uploaded yet. Upload your first video above!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {mediaFiles.map((media) => (
            <div
              key={media.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: 'white'
              }}
            >
              <h3 style={{
                fontSize: '1rem',
                marginBottom: '0.5rem',
                wordBreak: 'break-word'
              }}>
                {media.original_name}
              </h3>

              <div style={{
                fontSize: '0.85rem',
                color: '#7f8c8d',
                marginBottom: '0.5rem'
              }}>
                <div><strong>Size:</strong> {formatFileSize(media.file_size)}</div>
                <div><strong>Duration:</strong> {formatDuration(media.duration)}</div>
                <div><strong>Uploaded:</strong> {new Date(media.created_at).toLocaleDateString()}</div>
              </div>

              <button
                onClick={() => handleDelete(media.id)}
                className="btn btn-danger"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.5rem'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaManager;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UpgradePrompt from '../components/UpgradePrompt';
import { Button } from '../components/ui/button';
import { Upload, Cloud, HardDrive, Eye, User, ChevronLeft, ChevronRight, Trash2, Clapperboard } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

function MediaManager({ user }) {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [totalStorage, setTotalStorage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userStats, setUserStats] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const isAdmin = user && user.role === 'admin';

  // Pagination calculations
  const totalPages = Math.ceil(mediaFiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFiles = mediaFiles.slice(startIndex, endIndex);

  useEffect(() => {
    fetchMediaFiles();
    fetchUserStats();
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

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
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
      setCurrentPage(1); // Go to first page to see new upload
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

  const handlePreview = async (media) => {
    setPreviewMedia(media);
    setPreviewUrl(null); // Reset URL

    try {
      // Fetch the video URL (will be signed URL for S3, local path for local storage)
      const response = await api.get(`/media/${media.id}/url`);
      setPreviewUrl(response.data.url);
    } catch (err) {
      console.error('Failed to get media URL:', err);
      setError('Failed to load video preview');
      setPreviewMedia(null);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="text-center p-8">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="flex items-center gap-3">
          <Clapperboard className="w-8 h-8 text-primary" />
          Media Manager
        </h1>
        <p className="text-gray-500">Upload and manage pre-recorded videos for streaming</p>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}

      {/* Storage limit warnings and upgrade prompts */}
      {userStats && userStats.limits.storage_limit && (
        <>
          {/* Storage warning at 80% */}
          {totalStorage >= userStats.limits.storage_limit * 0.8 && totalStorage < userStats.limits.storage_limit * 0.9 && (
            <div className="p-4 bg-yellow-50 border border-yellow-400 rounded-lg mb-4 text-sm text-yellow-800">
              <strong>Storage Warning:</strong> You've used {Math.round((totalStorage / userStats.limits.storage_limit) * 100)}% of your storage limit ({formatFileSize(userStats.limits.storage_limit)}). Consider upgrading your plan for more storage.
            </div>
          )}

          {/* Storage critical warning at 90% */}
          {totalStorage >= userStats.limits.storage_limit * 0.9 && totalStorage < userStats.limits.storage_limit && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg mb-4 text-sm text-red-800">
              <strong>Critical:</strong> You've used {Math.round((totalStorage / userStats.limits.storage_limit) * 100)}% of your storage limit. You may not be able to upload new videos soon.
            </div>
          )}

          {/* Storage limit reached */}
          {totalStorage >= userStats.limits.storage_limit && (
            <div className="mb-4">
              <UpgradePrompt
                currentPlan={userStats.plan.name}
                requiredPlan={userStats.plan.name === 'Free' ? 'Basic' : userStats.plan.name === 'Basic' ? 'Pro' : 'Enterprise'}
                feature="additional storage"
                currentLimit={`${formatFileSize(userStats.limits.storage_limit)} (Full)`}
              />
            </div>
          )}
        </>
      )}

      {/* Storage Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-6 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Storage Used</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatFileSize(totalStorage)}
              {userStats && userStats.limits.storage_limit && (
                <span className="text-base text-gray-500 font-normal ml-2">
                  of {formatFileSize(userStats.limits.storage_limit)}
                </span>
              )}
            </div>
            {userStats && userStats.limits.storage_limit && (
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    totalStorage >= userStats.limits.storage_limit * 0.9
                      ? 'bg-red-500'
                      : totalStorage >= userStats.limits.storage_limit * 0.8
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((totalStorage / userStats.limits.storage_limit) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Total Files</div>
            <div className="text-2xl font-bold text-gray-900">{mediaFiles.length}</div>
          </div>
          {userStats && userStats.limits.storage_limit && (
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Plan Limit</div>
              <div className="text-lg font-semibold text-indigo-600">
                {formatFileSize(userStats.limits.storage_limit)}
              </div>
              <div className="text-xs text-gray-500">{userStats.plan.name} Plan</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-blue-500 rounded-lg p-8 text-center mb-8 bg-gray-50">
        <h3 className="mb-4 text-lg font-semibold">Upload Video</h3>
        <p className="text-gray-500 mb-4">
          Supported formats: MP4, WebM, MOV, MKV (Max 5GB)
        </p>

        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />

        <Button
          disabled={uploading}
          type="button"
          onClick={() => document.getElementById('file-upload').click()}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? `Uploading... ${uploadProgress}%` : 'Choose File'}
        </Button>

        {uploading && (
          <div className="mt-4 bg-gray-200 rounded h-6 overflow-hidden">
            <div
              className="bg-blue-500 h-full flex items-center justify-center text-white text-sm transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>

      {/* Media Files List */}
      <h2 className="mb-4 text-xl font-semibold">Your Videos ({mediaFiles.length})</h2>

      {mediaFiles.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500">
          <p>No videos uploaded yet. Upload your first video above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedFiles.map((media) => (
            <div
              key={media.id}
              className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:border-blue-300 transition-all duration-200"
            >
              <h3 className="text-base font-semibold mb-2 break-words">
                {media.original_name}
              </h3>

              <div className="text-sm text-gray-600 mb-2 space-y-1">
                {isAdmin && (
                  <div className="bg-blue-50 p-2 rounded mb-2 text-blue-700 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <strong>Uploaded by:</strong> {media.user_email || `User #${media.user_id}`}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <strong>Storage:</strong>
                  {media.storage_type === 's3' ? (
                    <span className="flex items-center gap-1"><Cloud className="w-4 h-4" /> Cloud (AWS S3)</span>
                  ) : (
                    <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> Local</span>
                  )}
                </div>
                <div><strong>Size:</strong> {formatFileSize(media.file_size)}</div>
                <div><strong>Duration:</strong> {formatDuration(media.duration)}</div>
                <div><strong>Uploaded:</strong> {new Date(media.created_at).toLocaleDateString()}</div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => handlePreview(media)}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-1" /> Preview
                </Button>
                <Button
                  onClick={() => handleDelete(media.id)}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6 pb-4">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              const showEllipsis = page === currentPage - 2 || page === currentPage + 2;

              if (showEllipsis && !showPage && page !== 1 && page !== totalPages) {
                return <span key={page} className="px-2 text-gray-400">...</span>;
              }

              if (!showPage) return null;

              return (
                <Button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-10"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Page Info */}
      {mediaFiles.length > 0 && (
        <div className="text-center text-sm text-gray-500 mt-2">
          Showing {startIndex + 1}-{Math.min(endIndex, mediaFiles.length)} of {mediaFiles.length} videos
        </div>
      )}

      {/* Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-8"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
              <h2 className="m-0 text-lg font-semibold">Preview: {previewMedia.original_name}</h2>
              <button
                onClick={() => setPreviewMedia(null)}
                className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {!previewUrl ? (
                <div className="w-full max-h-[500px] bg-gray-900 rounded flex items-center justify-center text-white p-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading video...</p>
                  </div>
                </div>
              ) : (
                <video
                  controls
                  autoPlay
                  className="w-full max-h-[500px] bg-black rounded"
                  key={previewUrl}
                >
                  <source src={previewUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="mb-3 font-semibold">Video Details</h3>
                <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><strong>File Name:</strong> {previewMedia.original_name}</div>
                  <div><strong>Size:</strong> {formatFileSize(previewMedia.file_size)}</div>
                  <div><strong>Duration:</strong> {formatDuration(previewMedia.duration)}</div>
                  <div className="flex items-center gap-1">
                    <strong>Storage:</strong>
                    {previewMedia.storage_type === 's3' ? (
                      <span className="flex items-center gap-1"><Cloud className="w-4 h-4" /> AWS S3</span>
                    ) : (
                      <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> Local</span>
                    )}
                  </div>
                  <div><strong>Uploaded:</strong> {new Date(previewMedia.created_at).toLocaleDateString()}</div>
                  {isAdmin && previewMedia.user_email && (
                    <div><strong>Uploaded by:</strong> {previewMedia.user_email}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-300 flex justify-end">
              <Button
                onClick={() => setPreviewMedia(null)}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaManager;

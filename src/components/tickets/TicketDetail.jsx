import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle,
  Paperclip, Download, Send, Loader2, Upload, User, XCircle as RemoveIcon
} from 'lucide-react';

function TicketDetail({ ticket: initialTicket, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTicketDetail();
  }, [initialTicket.id]);

  const fetchTicketDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${initialTicket.id}`);
      setTicket(response.data.ticket);
      setError('');
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
      setError('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (replyAttachments.length + files.length > 5) {
      setError('Maximum 5 attachments allowed');
      return;
    }

    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError('Each file must be smaller than 10MB');
      return;
    }

    setReplyAttachments(prev => [...prev, ...files]);
    setError('');
  };

  const removeAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', replyMessage);

      replyAttachments.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${ticket.id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReplyMessage('');
      setReplyAttachments([]);
      await fetchTicketDetail();
    } catch (err) {
      console.error('Failed to submit reply:', err);
      setError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;

    try {
      await api.post(`/tickets/${ticket.id}/close`);
      await fetchTicketDetail();
    } catch (err) {
      console.error('Failed to close ticket:', err);
      setError(err.response?.data?.error || 'Failed to close ticket');
    }
  };

  const downloadAttachment = async (attachmentId, filename) => {
    try {
      const response = await api.get(`/tickets/attachments/${attachmentId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download attachment:', err);
      setError('Failed to download attachment');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { icon: MessageSquare, text: 'Open', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { icon: Clock, text: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      waiting_customer: { icon: Clock, text: 'Waiting', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      resolved: { icon: CheckCircle, text: 'Resolved', className: 'bg-green-100 text-green-800 border-green-200' },
      closed: { icon: XCircle, text: 'Closed', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant="default" className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Ticket not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
              {getStatusBadge(ticket.status)}
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                {ticket.category}
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{ticket.subject}</h2>
            {ticket.channel_name && (
              <p className="text-sm text-gray-600">
                Related Channel: <span className="font-medium">{ticket.channel_name}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Created {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {ticket.status !== 'closed' && (
            <Button
              onClick={handleCloseTicket}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Close Ticket
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Timeline */}
      <div className="space-y-4 mb-6">
        {ticket.messages && ticket.messages.map((message, index) => {
          const isAdmin = message.user_role === 'admin';
          const isInternalNote = message.is_internal_note;

          if (isInternalNote) return null; // Don't show internal notes to users

          return (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                isAdmin ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50 border-l-4 border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isAdmin ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                }`}>
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {message.user_name || message.user_email}
                      </span>
                      {isAdmin && (
                        <Badge variant="default" className="ml-2 bg-blue-600 text-white text-xs">
                          Support Team
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{attachment.original_name}</span>
                            <span className="text-xs text-gray-500">({formatFileSize(attachment.file_size)})</span>
                          </div>
                          <button
                            onClick={() => downloadAttachment(attachment.id, attachment.original_name)}
                            className="text-blue-600 hover:text-blue-800 ml-2"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Form */}
      {ticket.status !== 'closed' && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h3>
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
              required
            />

            {/* File Attachments */}
            <div className="space-y-2">
              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Upload className="w-4 h-4" />
                  <span>Attach files (Max 5 files, 10MB each)</span>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.mp4,.mov,.avi"
                  className="hidden"
                  disabled={replyAttachments.length >= 5}
                />
              </label>

              {replyAttachments.length > 0 && (
                <div className="space-y-2">
                  {replyAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <RemoveIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {ticket.status === 'closed' && (
        <div className="border-t border-gray-200 pt-6">
          <Alert>
            <AlertDescription>
              This ticket has been closed. If you need further assistance, please create a new ticket.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

export default TicketDetail;

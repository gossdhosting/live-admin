import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TIMEZONES } from '../constants/timezones';

function ScheduleStreamDialog({ channel, onClose, onScheduled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduledStream, setScheduledStream] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  useEffect(() => {
    fetchScheduledStream();
  }, [channel.id]);

  const fetchScheduledStream = async () => {
    try {
      const response = await api.get(`/scheduled-streams/channel/${channel.id}/active`);
      if (response.data.schedule) {
        setScheduledStream(response.data.schedule);
        // Parse scheduled time to local date/time
        const scheduledTime = new Date(response.data.schedule.scheduled_start_time);
        const dateStr = scheduledTime.toISOString().split('T')[0];
        const timeStr = scheduledTime.toTimeString().split(' ')[0].substring(0, 5);
        setFormData({
          date: dateStr,
          time: timeStr,
          timezone: response.data.schedule.timezone,
        });
      }
    } catch (error) {
      console.error('Failed to fetch scheduled stream:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Combine date and time into ISO string
      const scheduledDateTime = `${formData.date}T${formData.time}:00`;
      const scheduledDate = new Date(scheduledDateTime);

      // Validate future time
      if (scheduledDate <= new Date()) {
        setError('Scheduled time must be in the future');
        setLoading(false);
        return;
      }

      const payload = {
        channel_id: channel.id,
        scheduled_start_time: scheduledDate.toISOString(),
        timezone: formData.timezone,
      };

      if (scheduledStream) {
        // Update existing schedule
        await api.put(`/scheduled-streams/${scheduledStream.id}`, {
          scheduled_start_time: scheduledDate.toISOString(),
          timezone: formData.timezone,
        });
      } else {
        // Create new schedule
        await api.post('/scheduled-streams', payload);
      }

      onScheduled && onScheduled();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to schedule stream');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!scheduledStream) return;

    if (!confirm('Are you sure you want to cancel this scheduled stream?')) return;

    setLoading(true);
    try {
      await api.post(`/scheduled-streams/${scheduledStream.id}/cancel`);
      onScheduled && onScheduled();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel schedule');
      setLoading(false);
    }
  };

  // Get minimum date/time (current time + 5 minutes)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000);
  const minDate = minDateTime.toISOString().split('T')[0];
  const minTime = minDateTime.toTimeString().split(' ')[0].substring(0, 5);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>{scheduledStream ? 'Update Scheduled Stream' : 'Schedule Stream'}</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Schedule when this stream should automatically start.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {scheduledStream && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #2196f3'
          }}>
            <strong>📅 Currently Scheduled:</strong>
            <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {new Date(scheduledStream.scheduled_start_time).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: scheduledStream.timezone
              })}
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                Timezone: {scheduledStream.timezone}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              className="form-control"
              value={formData.date}
              onChange={handleInputChange}
              min={minDate}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">Time *</label>
            <input
              type="time"
              id="time"
              name="time"
              className="form-control"
              value={formData.time}
              onChange={handleInputChange}
              required
            />
            <small style={{ color: '#666' }}>
              Minimum: {minDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone *</label>
            <select
              id="timezone"
              name="timezone"
              className="form-control"
              value={formData.timezone}
              onChange={handleInputChange}
              required
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            {scheduledStream && (
              <button
                type="button"
                className="btn"
                onClick={handleCancel}
                disabled={loading}
                style={{ backgroundColor: '#e74c3c', color: '#fff', marginRight: 'auto' }}
              >
                Cancel Schedule
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Close
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (scheduledStream ? 'Update Schedule' : 'Schedule Stream')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleStreamDialog;

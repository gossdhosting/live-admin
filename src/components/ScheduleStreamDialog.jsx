import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TIMEZONES } from '../constants/timezones';

function ScheduleStreamDialog({ channel, onClose, onScheduled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduledStream, setScheduledStream] = useState(null);
  const [userTimezone, setUserTimezone] = useState('UTC');
  const [formData, setFormData] = useState({
    date: '',
    time: '',
  });

  useEffect(() => {
    fetchUserTimezone();
    fetchScheduledStream();
  }, [channel.id]);

  const fetchUserTimezone = async () => {
    try {
      const response = await api.get('/user-settings');
      const timezone = response.data.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      setUserTimezone(timezone);
    } catch (error) {
      console.error('Failed to fetch user timezone:', error);
      // Fallback to browser timezone
      setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  };

  const fetchScheduledStream = async () => {
    try {
      const response = await api.get(`/scheduled-streams/channel/${channel.id}/active`);
      if (response.data.schedule) {
        setScheduledStream(response.data.schedule);
        // Parse scheduled time in the user's timezone
        const scheduledTime = new Date(response.data.schedule.scheduled_start_time);
        // Convert to user's timezone for display
        const tzTime = scheduledTime.toLocaleString('en-CA', {
          timeZone: response.data.schedule.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const [dateStr, timeStr] = tzTime.split(', ');
        setFormData({
          date: dateStr,
          time: timeStr,
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
      // User enters date/time in their timezone (e.g., 2026-01-19 13:57 in Asia/Kolkata)
      // We need to convert this to UTC for storage

      const [year, month, day] = formData.date.split('-').map(Number);
      const [hour, minute] = formData.time.split(':').map(Number);

      // Method: Find what UTC time would display as the desired local time
      // We iterate to find the correct UTC timestamp

      // Start with an initial guess - assume the input is UTC
      let testUtcTime = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

      // Format this UTC time in the user's timezone to see what it displays
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Get what this UTC displays as in user's timezone
      let formattedInTz = formatter.format(testUtcTime);
      let [displayedDate, displayedTime] = formattedInTz.split(', ');
      let [displayedMonth, displayedDay, displayedYear] = displayedDate.split('/').map(Number);
      let [displayedHour, displayedMinute] = displayedTime.split(':').map(Number);

      // Calculate how far off we are
      let hourDiff = hour - displayedHour;
      let minuteDiff = minute - displayedMinute;
      let dayDiff = day - displayedDay;

      // Adjust UTC by the difference (in milliseconds)
      const adjustmentMs = (dayDiff * 24 * 60 * 60 * 1000) + (hourDiff * 60 * 60 * 1000) + (minuteDiff * 60 * 1000);
      const correctUtcTime = new Date(testUtcTime.getTime() + adjustmentMs);

      // Verify it's correct
      const verifyFormatted = formatter.format(correctUtcTime);
      console.log('Timezone conversion:', {
        input: `${formData.date} ${formData.time}`,
        timezone: userTimezone,
        utcOutput: correctUtcTime.toISOString(),
        verifyDisplay: verifyFormatted,
        adjustment: { dayDiff, hourDiff, minuteDiff, adjustmentMs }
      });

      // Validate future time (check against current time)
      const nowTime = new Date();
      if (correctUtcTime <= nowTime) {
        setError('Scheduled time must be in the future');
        setLoading(false);
        return;
      }

      const payload = {
        channel_id: channel.id,
        scheduled_start_time: correctUtcTime.toISOString(),
        timezone: userTimezone,
      };

      if (scheduledStream) {
        // Update existing schedule
        await api.put(`/scheduled-streams/${scheduledStream.id}`, {
          scheduled_start_time: correctUtcTime.toISOString(),
          timezone: userTimezone,
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
              Time is in your timezone ({userTimezone})
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <div style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              color: '#666'
            }}>
              {TIMEZONES.find(tz => tz.value === userTimezone)?.label || userTimezone}
            </div>
            <small style={{ color: '#666' }}>
              To change timezone, update it in your profile settings
            </small>
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

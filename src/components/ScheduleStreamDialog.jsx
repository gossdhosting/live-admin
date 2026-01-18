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

  // Convert local date/time in a specific timezone to UTC
  const localToUtc = (dateStr, timeStr, timezone) => {
    // Strategy: Use toLocaleString to find what UTC time corresponds to the desired local time

    // Step 1: Start with the user's input as a naive date
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    // Step 2: Create a date object representing this time in UTC
    let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    // Step 3: See what this UTC time shows as in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const displayedInTz = formatter.format(utcGuess);
    const [displayedDate, displayedTime] = displayedInTz.split(', ');
    const [dy, dm, dd] = displayedDate.split('-').map(Number);
    const [dh, dmin] = displayedTime.split(':').map(Number);

    // Step 4: Calculate the difference
    const displayedUtc = Date.UTC(dy, dm - 1, dd, dh, dmin, 0);
    const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = displayedUtc - targetUtc;

    // Step 5: Adjust our guess
    const correctUtc = new Date(utcGuess.getTime() - diff);

    return correctUtc;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure timezone is valid, fallback to UTC if missing
      const tz = userTimezone || 'UTC';

      // Convert local time to UTC using the robust method
      const correctUtcTime = localToUtc(formData.date, formData.time, tz);

      // Debug logging
      const verifyInTz = correctUtcTime.toLocaleString('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      console.log('Timezone conversion:', {
        inputDate: formData.date,
        inputTime: formData.time,
        timezone: tz,
        utcIsoString: correctUtcTime.toISOString(),
        verifyBackInTz: verifyInTz,
        shouldMatch: `${formData.date} ${formData.time}`
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
        timezone: tz,
      };

      if (scheduledStream) {
        // Update existing schedule
        await api.put(`/scheduled-streams/${scheduledStream.id}`, {
          scheduled_start_time: correctUtcTime.toISOString(),
          timezone: tz,
        });
      } else {
        // Create new schedule
        await api.post('/scheduled-streams', payload);
      }

      onScheduled && onScheduled();
      onClose();
    } catch (error) {
      console.error('Schedule stream error:', error);
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

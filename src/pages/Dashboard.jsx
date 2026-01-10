import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ChannelCard from '../components/ChannelCard';
import CreateChannelModal from '../components/CreateChannelModal';
import EditChannelModal from '../components/EditChannelModal';
import UpgradePrompt from '../components/UpgradePrompt';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { RefreshCw, Plus, CheckCircle, AlertTriangle, XCircle, Radio } from 'lucide-react';

function Dashboard({ user }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [serverStats, setServerStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchChannels = async (silent = false) => {
      try {
        if (!silent && isMounted) setRefreshing(true);
        const response = await api.get('/channels');
        if (isMounted) {
          setChannels(response.data.channels);
          setLastUpdate(new Date());
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch streams:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const fetchServerStats = async () => {
      try {
        const response = await api.get('/server-stats');
        if (isMounted) {
          setServerStats(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch server stats:', error);
        }
      }
    };

    const fetchUserStats = async () => {
      try {
        const response = await api.get('/users/stats');
        if (isMounted) {
          setUserStats(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch user stats:', error);
        }
      }
    };

    fetchChannels();
    fetchServerStats();
    fetchUserStats();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchChannels(true);
      fetchServerStats();
      fetchUserStats();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const fetchChannels = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const response = await api.get('/channels');
      setChannels(response.data.channels);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChannelDeleted = (id) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setShowEditModal(true);
  };

  const handleRefresh = () => {
    fetchChannels();
  };

  const getStats = () => {
    const total = channels.length;
    const running = channels.filter(ch => ch.status === 'running').length;
    const stopped = channels.filter(ch => ch.status === 'stopped').length;
    const error = channels.filter(ch => ch.status === 'error').length;

    // Health stats for running streams
    const healthy = channels.filter(ch =>
      ch.status === 'running' &&
      ch.runtime_status?.healthMetrics?.status === 'healthy'
    ).length;

    const warnings = channels.filter(ch =>
      ch.status === 'running' &&
      (ch.runtime_status?.errorCount > 0 || ch.runtime_status?.reconnectAttempts > 0)
    ).length;

    return { total, running, stopped, error, healthy, warnings };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading streams...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="container">
      {/* Plan & Usage Stats Section (for users) */}
      {user && user.role !== 'admin' && userStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Plan & Usage</CardTitle>
            <CardDescription>{userStats.plan?.name} Plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Concurrent Streams */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">Concurrent Streams</div>
                <div className="text-3xl font-bold mb-2">
                  {stats.running} / {userStats.limits.max_concurrent_streams}
                </div>
                <div className="text-xs opacity-80 mb-3">
                  {userStats.limits.max_concurrent_streams - stats.running} available
                </div>
                <div className="w-full bg-white/20 rounded h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, (stats.running / userStats.limits.max_concurrent_streams) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Max Quality/Bitrate */}
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">Max Quality</div>
                <div className="text-3xl font-bold mb-2">
                  {userStats.limits.max_bitrate >= 6000 ? '1080p' : userStats.limits.max_bitrate >= 4000 ? '720p' : '480p'}
                </div>
                <div className="text-xs opacity-80">
                  {userStats.limits.max_bitrate}k bitrate
                </div>
              </div>

              {/* Storage */}
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">Storage</div>
                <div className="text-3xl font-bold mb-2">
                  {userStats?.usage?.storage_mb || 0} MB
                </div>
                <div className="text-xs opacity-80 mb-3">
                  {userStats.limits.storage_limit_mb} MB limit
                </div>
                <div className="w-full bg-white/20 rounded h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, ((userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Stream Duration */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">Stream Duration</div>
                <div className="text-3xl font-bold mb-2">
                  {userStats.limits.max_stream_duration || '∞'}
                </div>
                <div className="text-xs opacity-80">
                  {userStats.limits.max_stream_duration ? `${userStats.limits.max_stream_duration} min max` : 'Unlimited'}
                </div>
              </div>
            </div>

            {userStats?.canCreate && !userStats.canCreate.stream && (
              <UpgradePrompt
                currentPlan={userStats.plan?.name}
                requiredPlan={userStats.plan?.name === 'Free' ? 'Basic' : userStats.plan?.name === 'Basic' ? 'Pro' : 'Enterprise'}
                currentLimit={`${userStats.limits.max_concurrent_streams} concurrent ${userStats.limits.max_concurrent_streams === 1 ? 'stream' : 'streams'}`}
                requiredLimit={userStats.plan?.name === 'Free' ? '3 concurrent streams' : userStats.plan?.name === 'Basic' ? '10 concurrent streams' : '50 concurrent streams'}
              />
            )}

            {/* Storage limit warning (80% used) */}
            {userStats && (userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.8 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                ⚠️ You're using {Math.round((userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb * 100)}% of your storage limit.
                {(userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.95 && ' Uploads may fail soon.'}
              </div>
            )}

            {/* Show upgrade prompt if storage near limit */}
            {userStats && (userStats?.usage?.storage_mb || 0) / userStats.limits.storage_limit_mb > 0.9 && (
              <UpgradePrompt
                currentPlan={userStats.plan?.name}
                requiredPlan={userStats.plan?.name === 'Free' ? 'Basic' : userStats.plan?.name === 'Basic' ? 'Pro' : 'Enterprise'}
                currentLimit={`${userStats.limits.storage_limit_mb} MB storage`}
                requiredLimit={userStats.plan?.name === 'Free' ? '5 GB storage' : userStats.plan?.name === 'Basic' ? '50 GB storage' : '200 GB storage'}
              />
            )}

            {/* Show upgrade prompt for duration limit (Free plan only) */}
            {userStats && userStats.plan?.name === 'Free' && userStats.limits.max_stream_duration && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg text-blue-900 text-sm">
                ℹ️ Your streams will auto-stop after {userStats.limits.max_stream_duration} minutes. Upgrade to Basic or higher for unlimited streaming.
              </div>
            )}

            {/* Show upgrade prompt for quality limit */}
            {userStats && userStats.limits.max_bitrate < 6000 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-300 rounded-lg text-purple-900 text-sm">
                ℹ️ Your plan supports up to {userStats.limits.max_bitrate >= 4000 ? '720p' : '480p'} quality.
                {userStats.limits.max_bitrate < 6000 && ' Upgrade to Pro for 1080p streaming!'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Server Stats Section (for admins) */}
      {user && user.role === 'admin' && serverStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              {serverStats.system.hostname} • {serverStats.system.osDistro} • Uptime: {serverStats.system.uptimeFormatted}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Card */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">CPU Usage</div>
                <div className="text-3xl font-bold mb-2">
                  {serverStats.cpu.usage}%
                </div>
                <div className="text-xs opacity-80 mb-3">
                  {serverStats.cpu.cores} Cores
                  {serverStats.cpu.temperature && ` • ${serverStats.cpu.temperature}°C`}
                </div>
                <div className="w-full bg-white/20 rounded h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, serverStats.cpu.usage)}%`
                    }}
                  />
                </div>
              </div>

              {/* RAM Card */}
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-lg text-white shadow-md">
                <div className="text-sm opacity-90 mb-2">RAM Usage</div>
                <div className="text-3xl font-bold mb-2">
                  {serverStats.memory.usedPercent}%
                </div>
                <div className="text-xs opacity-80 mb-3">
                  {serverStats.memory.usedGB} GB / {serverStats.memory.totalGB} GB
                </div>
                <div className="w-full bg-white/20 rounded h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${serverStats.memory.usedPercent}%`
                    }}
                  />
                </div>
              </div>

              {/* Disk Card */}
              {serverStats.disk && (
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-lg text-white shadow-md">
                  <div className="text-sm opacity-90 mb-2">Disk Usage</div>
                  <div className="text-3xl font-bold mb-2">
                    {serverStats.disk.usedPercent}%
                  </div>
                  <div className="text-xs opacity-80 mb-3">
                    {serverStats.disk.usedGB} GB / {serverStats.disk.totalGB} GB
                  </div>
                  <div className="w-full bg-white/20 rounded h-1.5 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 ease-out"
                      style={{
                        width: `${serverStats.disk.usedPercent}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Network Card */}
              {serverStats.network && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-lg text-white shadow-md">
                  <div className="text-sm opacity-90 mb-2">Network</div>
                  <div className="text-xl font-bold mb-1">
                    ↓ {(serverStats.network.rx_sec / 1024 / 1024).toFixed(2)} MB/s
                  </div>
                  <div className="text-xl font-bold mb-3">
                    ↑ {(serverStats.network.tx_sec / 1024 / 1024).toFixed(2)} MB/s
                  </div>
                  <div className="text-xs opacity-80">
                    {serverStats.network.interface}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              Live Streams
            </CardTitle>
            <CardDescription>Manage your streaming channels</CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 flex-1 sm:flex-none"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2 flex-1 sm:flex-none" size="sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Stream</span><span className="sm:hidden">New</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No streams yet</h3>
              <p className="text-gray-500 mb-6">Create your first stream to get started with broadcasting</p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Stream
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                <Card className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Total</div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.running}</div>
                    <div className="text-xs sm:text-sm text-emerald-600 mt-1 font-medium">Running</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                      <CheckCircle className="w-5 h-5" />
                      {stats.healthy}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600 mt-1 font-medium">Healthy</div>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-amber-700 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-5 h-5" />
                      {stats.warnings}
                    </div>
                    <div className="text-xs sm:text-sm text-amber-600 mt-1 font-medium">Warnings</div>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.stopped}</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Stopped</div>
                  </CardContent>
                </Card>
                <Card className="border-rose-200 bg-rose-50/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-rose-700 flex items-center justify-center gap-1">
                      <XCircle className="w-5 h-5" />
                      {stats.error}
                    </div>
                    <div className="text-xs sm:text-sm text-rose-600 mt-1 font-medium">Errors</div>
                  </CardContent>
                </Card>
              </div>
              <div className="text-sm text-gray-400 text-right mt-2">
                Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh: Every 5s
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onUpdate={fetchChannels}
            onDelete={handleChannelDeleted}
            onEdit={handleEditChannel}
            user={user}
          />
        ))}
      </div>

      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchChannels}
      />

      <EditChannelModal
        isOpen={showEditModal}
        channel={editingChannel}
        onClose={() => {
          setShowEditModal(false);
          setEditingChannel(null);
        }}
        onSuccess={fetchChannels}
      />
    </div>
  );
}

export default Dashboard;

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import CreateTicketModal from './CreateTicketModal';
import TicketDetail from './TicketDetail';

function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data.tickets);
      setError('');
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketCreated = () => {
    setShowCreateModal(false);
    fetchTickets();
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
    fetchTickets();
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: 'default', icon: MessageSquare, text: 'Open', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { variant: 'default', icon: Clock, text: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      waiting_customer: { variant: 'default', icon: Clock, text: 'Waiting', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      resolved: { variant: 'default', icon: CheckCircle, text: 'Resolved', className: 'bg-green-100 text-green-800 border-green-200' },
      closed: { variant: 'secondary', icon: XCircle, text: 'Closed', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      technical: 'bg-purple-100 text-purple-800 border-purple-200',
      billing: 'bg-green-100 text-green-800 border-green-200',
      general: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels = {
      technical: 'Technical Support',
      billing: 'Billing Support',
      general: 'General',
    };

    return (
      <Badge variant="outline" className={colors[category] || colors.general}>
        {labels[category] || category}
      </Badge>
    );
  };

  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter(ticket => ticket.status === statusFilter);

  if (selectedTicket) {
    return <TicketDetail ticket={selectedTicket} onClose={handleCloseDetail} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Support Tickets</h3>
          <p className="text-sm text-gray-600 mt-1">Manage and track your support requests</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'open'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Open ({tickets.filter(t => t.status === 'open').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Progress ({tickets.filter(t => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'closed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Closed ({tickets.filter(t => t.status === 'closed').length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            {statusFilter === 'all' ? 'No support tickets yet' : `No ${statusFilter} tickets`}
          </p>
          <p className="text-gray-400 text-sm mt-1">Create a new ticket to get help from our support team</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => handleTicketClick(ticket)}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
                    {getStatusBadge(ticket.status)}
                    {getCategoryBadge(ticket.category)}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                    {ticket.subject}
                  </h4>
                  {ticket.channel_name && (
                    <p className="text-sm text-gray-600">
                      Channel: <span className="font-medium">{ticket.channel_name}</span>
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(ticket.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTicketCreated}
        />
      )}
    </div>
  );
}

export default TicketList;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from '../components/UserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Users as UsersIcon, Search } from 'lucide-react';

function Users({ user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UsersIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <p className="text-gray-600">
          Manage user accounts, view details, and perform administrative actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserManagement searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Users;

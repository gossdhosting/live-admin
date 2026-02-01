import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from '../components/UserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users as UsersIcon } from 'lucide-react';

function Users({ user }) {
  const navigate = useNavigate();

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
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement />
        </CardContent>
      </Card>
    </div>
  );
}

export default Users;

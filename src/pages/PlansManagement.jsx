import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlanManagement from '../components/PlanManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Gem } from 'lucide-react';

function PlansManagement({ user }) {
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
          <Gem className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Plan Management</h1>
        </div>
        <p className="text-gray-600">
          Create, edit, and manage subscription plans for your platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanManagement />
        </CardContent>
      </Card>
    </div>
  );
}

export default PlansManagement;

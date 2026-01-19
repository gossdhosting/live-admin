import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

function FAQManagement() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await api.get('/faqs/all');
      setFaqs(response.data.faqs);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      setMessage('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (editingFaq) {
        await api.put(`/faqs/${editingFaq.id}`, {
          ...formData,
          display_order: editingFaq.display_order,
        });
        setMessage('FAQ updated successfully');
      } else {
        await api.post('/faqs', {
          ...formData,
          display_order: faqs.length,
        });
        setMessage('FAQ created successfully');
      }

      setFormData({ question: '', answer: '', category: '', is_active: true });
      setEditingFaq(null);
      fetchFAQs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      is_active: faq.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    try {
      await api.delete(`/faqs/${id}`);
      setMessage('FAQ deleted successfully');
      fetchFAQs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to delete FAQ');
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;

    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];

    const faqOrders = newFaqs.map((faq, idx) => ({
      id: faq.id,
      display_order: idx,
    }));

    try {
      await api.post('/faqs/reorder', { faqOrders });
      setFaqs(newFaqs);
    } catch (error) {
      setMessage('Failed to reorder FAQs');
    }
  };

  const handleMoveDown = async (index) => {
    if (index === faqs.length - 1) return;

    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];

    const faqOrders = newFaqs.map((faq, idx) => ({
      id: faq.id,
      display_order: idx,
    }));

    try {
      await api.post('/faqs/reorder', { faqOrders });
      setFaqs(newFaqs);
    } catch (error) {
      setMessage('Failed to reorder FAQs');
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFaqs(newExpanded);
  };

  if (loading) {
    return <div className="text-center py-8">Loading FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
        </h3>

        {message && (
          <Alert className={message.includes('success') ? 'border-green-200 bg-green-50 mb-4' : 'border-red-200 bg-red-50 mb-4'}>
            <AlertDescription className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <Label htmlFor="question">Question *</Label>
            <Input
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
              placeholder="What is your question?"
            />
          </div>

          <div>
            <Label htmlFor="answer">Answer *</Label>
            <textarea
              id="answer"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              required
              rows={4}
              placeholder="Provide a clear and helpful answer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Streaming, Account, Billing"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active">Active (visible to users)</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
            </Button>
            {editingFaq && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingFaq(null);
                  setFormData({ question: '', answer: '', category: '', is_active: true });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Existing FAQs ({faqs.length})
        </h3>

        {faqs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No FAQs yet. Create your first FAQ above.</p>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-white">
                  <button
                    onClick={() => toggleExpand(faq.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{faq.question}</p>
                        {faq.category && (
                          <p className="text-xs text-gray-500 mt-1">Category: {faq.category}</p>
                        )}
                      </div>
                      {!faq.is_active && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {expandedFaqs.has(faq.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedFaqs.has(faq.id) && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{faq.answer}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(faq)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === faqs.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(faq.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FAQManagement;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare } from 'lucide-react';
import TicketList from '../components/tickets/TicketList';

function Help() {
  const [activeTab, setActiveTab] = useState('faqs');
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await api.get('/faqs');
      setFaqs(response.data.faqs);

      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.faqs.map(faq => faq.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
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

  const filteredFaqs = selectedCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Help & Support</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Find answers or contact support
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'faqs'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                FAQs
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'tickets'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Support Tickets
              </div>
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* FAQ Tab */}
          {activeTab === 'faqs' && (
            <>
              {loading ? (
                <div className="text-center py-8">Loading help articles...</div>
              ) : (
                <>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Category Filter */}
                  {categories.length > 0 && (
                    <div className="mb-6">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQ List */}
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-12">
                      <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        {selectedCategory === 'all'
                          ? 'No FAQs available yet.'
                          : `No FAQs in the "${selectedCategory}" category.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredFaqs.map((faq) => (
                        <div
                          key={faq.id}
                          className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md"
                        >
                          <button
                            onClick={() => toggleExpand(faq.id)}
                            className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex-1 pr-4">
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {faq.question}
                              </h3>
                              {faq.category && (
                                <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {faq.category}
                                </span>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {expandedFaqs.has(faq.id) ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          </button>

                          {expandedFaqs.has(faq.id) && (
                            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                              <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact Support Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">
                        Can't find what you're looking for?
                      </p>
                      <button
                        onClick={() => setActiveTab('tickets')}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Create a support ticket
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <TicketList />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Help;

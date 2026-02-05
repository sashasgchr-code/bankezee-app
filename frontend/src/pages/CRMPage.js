import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Search, Filter } from 'lucide-react';

const CRMPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/leads${params}`);
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.mobile.includes(searchQuery) ||
    lead.id.includes(searchQuery)
  );

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      documents_collected: 'bg-purple-100 text-purple-800',
      sent_to_bank: 'bg-indigo-100 text-indigo-800',
      approved: 'bg-green-100 text-green-800',
      disbursed: 'bg-primary/20 text-primary',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading CRM...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              if (user.role === 'admin' || user.role === 'operations') {
                navigate('/admin/dashboard');
              } else if (user.role === 'sales_agent') {
                navigate('/agent/dashboard');
              }
            }}
            variant="ghost"
            size="sm"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Lead Management</h1>
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        <Card className="mb-6" data-testid="crm-filters-card">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, mobile, or ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-slate-50 border-slate-200"
                  data-testid="search-input"
                />
              </div>
              
              <Select value={statusFilter || undefined} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200" data-testid="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="documents_collected">Documents Collected</SelectItem>
                  <SelectItem value="sent_to_bank">Sent to Bank</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="leads-list-card">
          <CardHeader>
            <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    data-testid={`lead-row-${lead.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{lead.full_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-slate-600">
                        <span>{lead.mobile}</span>
                        <span>•</span>
                        <span className="capitalize">{lead.requirement?.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{lead.city}</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      <span className="capitalize">{lead.source}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No leads found matching your criteria
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMPage;
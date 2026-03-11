import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, Download, ArrowLeft, Calendar, Users, Filter, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const RejectedCasesReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [managers, setManagers] = useState([]);
  const [expandedLeads, setExpandedLeads] = useState({});
  
  // Filters
  const [timeFilter, setTimeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [managerId, setManagerId] = useState('all');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/reports/managers-list');
      setManagers(response.data);
    } catch (error) {
      console.error('Failed to fetch managers');
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let start, end;
    
    switch (timeFilter) {
      case 'today':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'yesterday':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));
        break;
      case 'this_week':
        const dayOfWeek = now.getUTCDay();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'last_week':
        const lastWeekDay = now.getUTCDay();
        const lastWeekStart = now.getUTCDate() - lastWeekDay - 7;
        const lastWeekEnd = now.getUTCDate() - lastWeekDay - 1;
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), lastWeekStart));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), lastWeekEnd, 23, 59, 59));
        break;
      case 'this_month':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'last_month':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
        break;
      case 'custom':
        if (fromDate && toDate) {
          start = new Date(fromDate + 'T00:00:00Z');
          end = new Date(toDate + 'T23:59:59Z');
        } else {
          start = new Date('2020-01-01T00:00:00Z');
          end = now;
        }
        break;
      default: // 'all'
        start = new Date('2020-01-01T00:00:00Z');
        end = now;
    }
    
    // Format as YYYY-MM-DD
    const formatDate = (d) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      from: formatDate(start),
      to: formatDate(end)
    };
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to
      });
      
      if (managerId !== 'all') {
        params.append('manager_id', managerId);
      }
      
      const response = await api.get(`/reports/rejected-cases?${params.toString()}`);
      setReportData(response.data);
      toast.success(`Found ${response.data.leads?.length || 0} rejected/declined cases`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const toggleLeadExpand = (leadId) => {
    setExpandedLeads(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const exportToCSV = () => {
    if (!reportData?.leads?.length) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Lead Name', 'Mobile', 'City', 'Employment Type', 'Source', 'Status',
      'Bank', 'Eligible?', 'Eligible Amount', 'Eligible ROI', 'Not Eligible Reason',
      'Login Done?', 'Login Rejection Reason', 'SM Name', 'SM Number',
      'Approval Status', 'Approved Amount', 'Approved ROI', 'Declined Reason',
      'Disbursed?', 'Disbursed Amount', 'Disbursement Rejection Reason'
    ];

    const rows = [];
    reportData.leads.forEach(lead => {
      const eligibilities = lead.eligibilities || [];
      if (eligibilities.length === 0) {
        rows.push([
          lead.full_name, lead.mobile, lead.city, lead.employment_type, lead.source, lead.status,
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
      } else {
        eligibilities.forEach((elig, idx) => {
          rows.push([
            idx === 0 ? lead.full_name : '',
            idx === 0 ? lead.mobile : '',
            idx === 0 ? lead.city : '',
            idx === 0 ? lead.employment_type : '',
            idx === 0 ? lead.source : '',
            idx === 0 ? lead.status : '',
            elig.bank_name || '',
            elig.is_eligible || '',
            elig.eligible_amount || '',
            elig.eligible_roi || '',
            elig.not_eligible_reason || '',
            elig.login_done || '',
            elig.login_rejection_reason || '',
            elig.sm_name || '',
            elig.sm_number || '',
            elig.approval_status || '',
            elig.approved_amount || '',
            elig.approved_roi || '',
            elig.declined_reason || '',
            elig.disbursed || '',
            elig.disbursed_amount || '',
            elig.disbursement_rejection_reason || ''
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rejected_Cases_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Report exported successfully');
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'not_eligible': 'bg-orange-100 text-orange-800',
      'declined': 'bg-red-100 text-red-800',
      'rejected': 'bg-red-100 text-red-800',
      'not_interested': 'bg-gray-100 text-gray-800',
      'not_supporting': 'bg-yellow-100 text-yellow-800',
      'fi_negative': 'bg-purple-100 text-purple-800',
    };
    return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <h1 className="text-xl font-bold text-slate-800">Rejected Cases Report</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reportData?.leads?.length > 0 && (
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Time Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Time Period
                </Label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger data-testid="time-filter">
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {timeFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      data-testid="from-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      data-testid="to-date-input"
                    />
                  </div>
                </>
              )}

              {/* Manager Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manager
                </Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger data-testid="manager-filter">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <Button
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700"
                  data-testid="generate-report-btn"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{reportData.summary?.total_cases || 0}</p>
                  <p className="text-sm text-red-800">Total Cases</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{reportData.summary?.not_eligible || 0}</p>
                  <p className="text-sm text-orange-800">Not Eligible</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{reportData.summary?.not_login || 0}</p>
                  <p className="text-sm text-yellow-800">Not Login</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{reportData.summary?.fi_negative || 0}</p>
                  <p className="text-sm text-purple-800">FI Negative</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-600">{reportData.summary?.declined || 0}</p>
                  <p className="text-sm text-gray-800">Declined</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-rose-600">{reportData.summary?.not_disbursed || 0}</p>
                  <p className="text-sm text-rose-800">Not Disbursed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {reportData?.leads?.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700">
              Rejected/Declined Cases ({reportData.leads.length})
            </h2>
            
            {reportData.leads.map((lead, index) => (
              <Card key={lead.id || index} className="overflow-hidden">
                {/* Lead Header */}
                <div 
                  className="bg-gradient-to-r from-red-50 to-orange-50 p-4 cursor-pointer"
                  onClick={() => toggleLeadExpand(lead.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="font-bold text-red-700 text-lg">{lead.full_name}</span>
                        <span className="text-slate-500">- {lead.mobile}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lead.status)}`}>
                        {lead.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{lead.eligibilities?.length || 0}</span> bank(s)
                      </div>
                      {expandedLeads[lead.id] ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-slate-600">
                    <span>City: <strong>{lead.city || '-'}</strong></span>
                    <span>Employment: <strong>{lead.employment_type || '-'}</strong></span>
                    <span>Source: <strong>{lead.source || '-'}</strong></span>
                    {lead.source_name && <span>Agent/Partner: <strong>{lead.source_name}</strong></span>}
                  </div>
                </div>

                {/* Eligibilities Table - Always visible or expandable */}
                {(expandedLeads[lead.id] !== false) && lead.eligibilities?.length > 0 && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Bank</th>
                            <th className="px-3 py-2 text-left font-semibold">Eligible?</th>
                            <th className="px-3 py-2 text-left font-semibold">Elig. Amount</th>
                            <th className="px-3 py-2 text-left font-semibold">Login?</th>
                            <th className="px-3 py-2 text-left font-semibold">Approval</th>
                            <th className="px-3 py-2 text-left font-semibold">Appr. Amount</th>
                            <th className="px-3 py-2 text-left font-semibold">Disbursed?</th>
                            <th className="px-3 py-2 text-left font-semibold">Disb. Amount</th>
                            <th className="px-3 py-2 text-left font-semibold min-w-[300px]">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lead.eligibilities.map((elig, eligIdx) => {
                            // Determine the reason to show based on the rejection stage
                            let reason = '';
                            let reasonType = '';
                            
                            if (elig.is_eligible?.toLowerCase() === 'no' && elig.not_eligible_reason) {
                              reason = elig.not_eligible_reason;
                              reasonType = 'Not Eligible';
                            } else if (elig.login_done?.toLowerCase() === 'no' && elig.login_rejection_reason) {
                              reason = elig.login_rejection_reason;
                              reasonType = 'Login Rejected';
                            } else if (elig.approval_status?.toLowerCase() === 'declined' && elig.declined_reason) {
                              reason = elig.declined_reason;
                              reasonType = 'Declined';
                            } else if (elig.disbursed?.toLowerCase() === 'no' && elig.disbursement_rejection_reason) {
                              reason = elig.disbursement_rejection_reason;
                              reasonType = 'Not Disbursed';
                            }

                            const hasRejection = reason || 
                              elig.is_eligible?.toLowerCase() === 'no' ||
                              elig.login_done?.toLowerCase() === 'no' ||
                              elig.approval_status?.toLowerCase() === 'declined' ||
                              elig.disbursed?.toLowerCase() === 'no';

                            return (
                              <tr 
                                key={eligIdx} 
                                className={`border-b ${hasRejection ? 'bg-red-50/50' : 'bg-white'} hover:bg-slate-50`}
                              >
                                <td className="px-3 py-3 font-medium">{elig.bank_name || '-'}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    elig.is_eligible?.toLowerCase() === 'yes' 
                                      ? 'bg-green-100 text-green-800' 
                                      : elig.is_eligible?.toLowerCase() === 'no'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {elig.is_eligible || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">{formatCurrency(elig.eligible_amount)}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    elig.login_done?.toLowerCase() === 'yes' 
                                      ? 'bg-green-100 text-green-800' 
                                      : elig.login_done?.toLowerCase() === 'no'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {elig.login_done || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">{elig.sm_name || '-'}</td>
                                <td className="px-3 py-3">{elig.sm_number || '-'}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    elig.approval_status?.toLowerCase() === 'approved' 
                                      ? 'bg-green-100 text-green-800' 
                                      : elig.approval_status?.toLowerCase() === 'declined'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {elig.approval_status || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">{formatCurrency(elig.approved_amount)}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    elig.disbursed?.toLowerCase() === 'yes' 
                                      ? 'bg-green-100 text-green-800' 
                                      : elig.disbursed?.toLowerCase() === 'no'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {elig.disbursed || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">{formatCurrency(elig.disbursed_amount)}</td>
                                <td className="px-3 py-3">
                                  {reason ? (
                                    <div className="max-w-[300px]">
                                      <span className="text-xs text-red-600 font-medium block mb-1">
                                        {reasonType}:
                                      </span>
                                      <span className="text-red-700 whitespace-normal break-words">
                                        {reason}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}

                {/* No eligibilities message */}
                {lead.eligibilities?.length === 0 && (
                  <CardContent>
                    <p className="text-slate-500 text-center py-4">No bank eligibilities recorded</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : reportData && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No rejected/declined cases found for the selected filters</p>
                <p className="text-sm mt-2">Try adjusting your date range or manager filter</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!reportData && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select filters and click "Generate Report"</p>
                <p className="text-sm mt-2">This report shows all cases with rejection reasons at any stage</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default RejectedCasesReport;

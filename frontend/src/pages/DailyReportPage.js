import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaskedField, MaskedText } from '@/components/ui/masked-field';
import api from '@/utils/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, Download, FileText, TrendingUp, Users, 
  DollarSign, CheckCircle, XCircle, Clock, Building2,
  Calendar, Filter, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { maskMobile, maskEmail, canUnmask } from '@/utils/masking';

const COLORS = ['#22af47', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

const STATUS_COLORS = {
  new: '#f59e0b',
  contacted: '#3b82f6',
  documents_pending: '#8b5cf6',
  documents_collected: '#06b6d4',
  sent_to_bank: '#ec4899',
  sent_for_login: '#f97316',
  login: '#84cc16',
  approved: '#22af47',
  disbursed: '#10b981',
  rejected: '#ef4444',
  not_eligible: '#6b7280',
  eligibility: '#14b8a6'
};

const DailyReportPage = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const chartsRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [managers, setManagers] = useState([]);
  
  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedManager, setSelectedManager] = useState('all');
  
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

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select date range');
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate
      });
      if (selectedManager !== 'all') {
        params.append('manager_id', selectedManager);
      }
      
      const response = await api.get(`/reports/daily-report?${params}`);
      setReportData(response.data);
      toast.success(`Found ${response.data.leads.length} leads with activity`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || '#6b7280';

  // Prepare chart data
  const statusChartData = reportData ? 
    Object.entries(reportData.summary.status_distribution).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
      color: getStatusColor(name)
    })) : [];

  const loanTypeChartData = reportData ?
    Object.entries(reportData.summary.loan_type_distribution).map(([name, value]) => ({
      name: name || 'Not Specified',
      count: value
    })) : [];

  const generatePDF = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    toast.info('Generating PDF report...');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = 20;
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(34, 175, 71); // Brand green
      pdf.text('Bankezee Daily Report', margin, currentY);
      currentY += 8;
      
      // Date range
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Report Period: ${fromDate} to ${toDate}`, margin, currentY);
      currentY += 5;
      pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, currentY);
      currentY += 5;
      if (selectedManager !== 'all') {
        const manager = managers.find(m => m.id === selectedManager);
        pdf.text(`Manager: ${manager?.name || 'Unknown'}`, margin, currentY);
        currentY += 5;
      }
      
      // Summary Stats
      currentY += 8;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Summary Statistics', margin, currentY);
      currentY += 5;
      
      pdf.setFontSize(10);
      const stats = [
        ['Total Leads with Activity', reportData.summary.total_leads.toString()],
        ['Total Eligible (Login=Yes)', formatCurrency(reportData.summary.total_eligible_amount)],
        ['Total Approved Amount', formatCurrency(reportData.summary.total_approved_amount)],
        ['Total Disbursed Amount', formatCurrency(reportData.summary.total_disbursed_amount)]
      ];
      
      autoTable(pdf, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: stats,
        theme: 'grid',
        headStyles: { fillColor: [34, 175, 71] },
        margin: { left: margin, right: margin },
        tableWidth: 80
      });
      
      currentY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 10 : currentY + 40;
      
      // Status Distribution
      const statusData = Object.entries(reportData.summary.status_distribution || {}).map(([status, count]) => [
        status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count.toString()
      ]);
      
      if (statusData.length > 0) {
        autoTable(pdf, {
          startY: currentY,
          head: [['Status', 'Count']],
          body: statusData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: margin, right: margin },
          tableWidth: 80
        });
        currentY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 10 : currentY + 40;
      }
      
      // Capture charts as image
      if (chartsRef.current) {
        try {
          const chartsCanvas = await html2canvas(chartsRef.current, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const chartsImg = chartsCanvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (chartsCanvas.height * imgWidth) / chartsCanvas.width;
          
          if (currentY + imgHeight + 10 > pageHeight) {
            pdf.addPage();
            pdf.addImage(chartsImg, 'PNG', margin, 20, imgWidth, Math.min(imgHeight, 100));
          } else {
            pdf.addImage(chartsImg, 'PNG', margin, currentY, imgWidth, Math.min(imgHeight, 100));
          }
        } catch (chartError) {
          console.error('Chart capture error:', chartError);
          // Continue without charts
        }
      }
      
      // Add new page for detailed leads
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Detailed Lead Report', margin, 20);
      
      // Leads table - simplified columns (mask data for non-admin/ops)
      const shouldMask = !canUnmask();
      const leadsTableData = reportData.leads.map(lead => [
        lead.full_name || '-',
        shouldMask ? maskMobile(lead.mobile) : (lead.mobile || '-'),
        lead.loan_type || '-',
        (lead.current_status || 'new').replace(/_/g, ' '),
        lead.source_info?.name || '-',
        formatCurrency(lead.total_approved_amount),
        formatCurrency(lead.total_disbursed_amount)
      ]);
      
      autoTable(pdf, {
        startY: 25,
        head: [['Name', 'Mobile', 'Loan Type', 'Status', 'Agent/Partner', 'Approved', 'Disbursed']],
        body: leadsTableData,
        theme: 'grid',
        headStyles: { fillColor: [34, 175, 71], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 }
        }
      });
      
      // Add eligibility details for each lead
      currentY = pdf.lastAutoTable.finalY + 15;
      
      for (const lead of reportData.leads) {
        if (lead.eligibility_summary && lead.eligibility_summary.length > 0) {
          if (currentY > pageHeight - 50) {
            pdf.addPage();
            currentY = 20;
          }
          
          pdf.setFontSize(10);
          pdf.setTextColor(34, 175, 71);
          pdf.text(`${lead.full_name} - Bank Eligibility Details`, margin, currentY);
          currentY += 5;
          
          const eligData = lead.eligibility_summary.map(e => [
            e.bank || '-',
            e.is_eligible || '-',
            e.eligible_amount ? formatCurrency(e.eligible_amount) : '-',
            e.login_done || '-',
            e.approval_status || '-',
            e.approved_amount ? formatCurrency(e.approved_amount) : '-',
            e.disbursed || '-',
            e.disbursed_amount ? formatCurrency(e.disbursed_amount) : '-',
            e.not_eligible_reason || e.declined_reason || e.disbursement_rejection_reason || '-'
          ]);
          
          autoTable(pdf, {
            startY: currentY,
            head: [['Bank', 'Eligible', 'Elig. Amt', 'Login', 'Approval', 'Appr. Amt', 'Disbursed', 'Disb. Amt', 'Reason']],
            body: eligData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], fontSize: 6 },
            bodyStyles: { fontSize: 5 },
            margin: { left: margin, right: margin }
          });
          
          currentY = pdf.lastAutoTable.finalY + 10;
        }
      }
      
      // Save PDF
      const fileName = `Bankezee_Daily_Report_${fromDate}_to_${toDate}.pdf`;
      pdf.save(fileName);
      toast.success('PDF report downloaded successfully!');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Daily Report</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-8">
        {/* Filters Card */}
        <Card className="mb-6" data-testid="filters-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  data-testid="from-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  data-testid="to-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Manager</Label>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger data-testid="manager-select">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={fetchReport} 
                  disabled={loading}
                  className="flex-1"
                  data-testid="generate-report-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {reportData && (
          <div ref={reportRef}>
            {/* Summary Stats - 4 cards (removed Total Login Amt) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700" data-testid="total-leads">
                    {reportData.summary.total_leads}
                  </p>
                  <p className="text-sm text-blue-600">Leads with Activity</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-lg font-bold text-green-700" data-testid="total-eligible">
                    {formatCurrency(reportData.summary.total_eligible_amount)}
                  </p>
                  <p className="text-sm text-green-600">Total Eligible (Login=Yes)</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-lg font-bold text-purple-700" data-testid="total-approved">
                    {formatCurrency(reportData.summary.total_approved_amount)}
                  </p>
                  <p className="text-sm text-purple-600">Total Approved</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-lg font-bold text-orange-700" data-testid="total-disbursed">
                    {formatCurrency(reportData.summary.total_disbursed_amount)}
                  </p>
                  <p className="text-sm text-orange-600">Total Disbursed</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section - 2 charts (removed Daily Activity Trend) */}
            <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Status Distribution Pie Chart - Shows COUNT instead of % */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} leads`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-400">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Loan Type Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leads by Loan Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {loanTypeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={loanTypeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#22af47">
                          <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#334155' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-400">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Download Button */}
            <div className="flex justify-end mb-6">
              <Button 
                onClick={generatePDF} 
                disabled={generating}
                size="lg"
                className="bg-primary hover:bg-primary/90"
                data-testid="download-pdf-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF Report
                  </>
                )}
              </Button>
            </div>

            {/* Detailed Leads Table */}
            <Card data-testid="leads-table-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detailed Lead Report ({reportData.leads.length} leads)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Customer</th>
                        <th className="px-3 py-2 text-left font-medium">Contact</th>
                        <th className="px-3 py-2 text-left font-medium">Loan Type</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Agent/Partner</th>
                        <th className="px-3 py-2 text-right font-medium">Approved</th>
                        <th className="px-3 py-2 text-right font-medium">Disbursed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.leads.map((lead) => (
                        <tr 
                          key={lead.id} 
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => navigate(`/crm/lead/${lead.id}`)}
                          data-testid={`lead-row-${lead.id}`}
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium">{lead.full_name}</div>
                            <div className="text-xs text-slate-500">{lead.city}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div><MaskedField value={lead.mobile} type="mobile" /></div>
                            <div className="text-xs text-slate-500"><MaskedField value={lead.email} type="email" /></div>
                          </td>
                          <td className="px-3 py-3">{lead.loan_type || '-'}</td>
                          <td className="px-3 py-3">
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${getStatusColor(lead.current_status)}20`,
                                color: getStatusColor(lead.current_status)
                              }}
                            >
                              {(lead.current_status || 'new').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div>{lead.source_info?.name || '-'}</div>
                            <div className="text-xs text-slate-500">{lead.source_info?.type || ''}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-purple-600">
                            {formatCurrency(lead.total_approved_amount)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-orange-600">
                            {formatCurrency(lead.total_disbursed_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {reportData.leads.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No leads found</p>
                    <p className="text-sm">No leads with activity in the selected date range</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Eligibility Details Section */}
            {reportData.leads.some(l => l.eligibility_summary?.length > 0) && (
              <Card className="mt-6" data-testid="eligibility-details-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Bank Eligibility Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {reportData.leads.filter(l => l.eligibility_summary?.length > 0).map((lead) => (
                      <div key={lead.id} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-primary mb-3">
                          {lead.full_name} - <MaskedField value={lead.mobile} type="mobile" />
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="px-2 py-1 text-left">Bank</th>
                                <th className="px-2 py-1 text-left">Eligible</th>
                                <th className="px-2 py-1 text-right">Elig. Amount</th>
                                <th className="px-2 py-1 text-left">Login</th>
                                <th className="px-2 py-1 text-left">Approval</th>
                                <th className="px-2 py-1 text-right">Appr. Amount</th>
                                <th className="px-2 py-1 text-left">Disbursed</th>
                                <th className="px-2 py-1 text-right">Disb. Amount</th>
                                <th className="px-2 py-1 text-left">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {lead.eligibility_summary.map((elig, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-2 py-2 font-medium">{elig.bank || '-'}</td>
                                  <td className="px-2 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      elig.is_eligible === 'Yes' ? 'bg-green-100 text-green-700' :
                                      elig.is_eligible === 'No' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {elig.is_eligible || '-'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right">{elig.eligible_amount ? formatCurrency(elig.eligible_amount) : '-'}</td>
                                  <td className="px-2 py-2">{elig.login_done || '-'}</td>
                                  <td className="px-2 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      elig.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                                      elig.approval_status === 'Declined' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {elig.approval_status || '-'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right">{elig.approved_amount ? formatCurrency(elig.approved_amount) : '-'}</td>
                                  <td className="px-2 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      elig.disbursed === 'Yes' ? 'bg-green-100 text-green-700' :
                                      elig.disbursed === 'No' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {elig.disbursed || '-'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right">{elig.disbursed_amount ? formatCurrency(elig.disbursed_amount) : '-'}</td>
                                  <td className="px-2 py-2 text-red-600 max-w-[150px] truncate" title={elig.not_eligible_reason || elig.declined_reason || elig.disbursement_rejection_reason}>
                                    {elig.not_eligible_reason || elig.declined_reason || elig.disbursement_rejection_reason || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!reportData && !loading && (
          <Card className="text-center py-16">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">Generate Your Daily Report</h3>
              <p className="text-slate-500 mb-4">Select a date range and click "Generate Report" to view comprehensive lead activity</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DailyReportPage;

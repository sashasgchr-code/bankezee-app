import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, ArrowLeft, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatAmt = (v) => {
  if (!v) return '₹0';
  const n = Number(v);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const AgentPerformanceReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [managers, setManagers] = useState([]);
  const reportRef = useRef(null);
  
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [managerId, setManagerId] = useState('all');

  useEffect(() => {
    api.get('/reports/managers-list').then(r => setManagers(r.data)).catch(() => {});
  }, []);

  const fetchReport = async () => {
    if (!fromDate || !toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (managerId !== 'all') params.append('manager_id', managerId);
      const res = await api.get(`/reports/agent-performance?${params}`);
      setReportData(res.data);
    } catch { toast.error('Failed to fetch report'); }
    finally { setLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    toast.info('Generating PDF...');
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(imgData, 'JPEG', (pdfW - w) / 2, 3, w, h);
      pdf.save(`GP_Performance_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF exported');
    } catch { toast.error('PDF export failed'); }
    finally { setExporting(false); }
  };

  const r = reportData;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b sticky top-0 z-10 print:static">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="print:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">Growth Partner Performance Report</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            {r && <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Filters */}
        <Card className="mb-4 print:hidden">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-slate-500 mb-1">From</p>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 h-9" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">To</p>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 h-9" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Manager</p>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchReport} disabled={loading} className="h-9">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!r && !loading && (
          <div className="text-center py-20 text-slate-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select filters and click Generate Report</p>
          </div>
        )}

        {r && (
          <div ref={reportRef} className="bg-white p-5 rounded-lg">
            <div className="text-center pb-3 border-b mb-4">
              <h2 className="text-lg font-bold text-slate-800">BANKEZEE - GROWTH PARTNER PERFORMANCE</h2>
              <p className="text-sm text-slate-500">{fromDate} to {toDate} | {r.totals.total_agents} Growth Partners</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg border">
                <p className="text-2xl font-bold text-blue-700">{r.totals.total_agents}</p>
                <p className="text-[10px] text-slate-500">Growth Partners</p>
              </div>
              <div className="text-center p-3 rounded-lg border">
                <p className="text-2xl font-bold">{r.totals.files_generated}</p>
                <p className="text-[10px] text-slate-500">Files Generated</p>
              </div>
              <div className="text-center p-3 rounded-lg border">
                <p className="text-2xl font-bold text-indigo-600">{r.totals.login_c + r.totals.login_s}</p>
                <p className="text-[10px] text-slate-500">Logged In</p>
              </div>
              <div className="text-center p-3 rounded-lg border">
                <p className="text-2xl font-bold text-green-600">{r.totals.approved_c + r.totals.approved_s}</p>
                <p className="text-[10px] text-slate-500">Approved</p>
              </div>
              <div className="text-center p-3 rounded-lg border bg-green-50">
                <p className="text-2xl font-bold text-green-700">{r.totals.disbursed_c + r.totals.disbursed_s}</p>
                <p className="text-[10px] text-slate-500">Disbursed</p>
              </div>
              <div className="text-center p-3 rounded-lg border bg-green-50">
                <p className="text-xl font-bold text-green-700">{formatAmt(r.totals.disb_amt)}</p>
                <p className="text-[10px] text-slate-500">Total Disbursed</p>
              </div>
            </div>

            {/* Main Table - 2 rows per GP */}
            {(() => {
              // Determine which in-progress columns have any data (hide all-zero columns)
              const ipCols = [
                { key: 'contacted', label: 'Contacted' },
                { key: 'docs_collected', label: 'Docs Collected' },
                { key: 'docs_pending', label: 'Docs Pending' },
                { key: 'sent_elig', label: 'Sent Eligibility' },
                { key: 'sent_login', label: 'Sent Login' },
                { key: 'login', label: 'Login Done' },
                { key: 'sent_appr', label: 'Sent Approval' },
                { key: 'uw', label: 'Underwriting' },
                { key: 'fi', label: 'FI' },
                { key: 'fi_reinit', label: 'FI Reinitiated' },
                { key: 'q_hold', label: 'Query/Hold' },
              ];
              const activeCols = ipCols.filter(col => 
                r.agents.some(a => (a[col.key] || 0) > 0)
              );

              // Check which activity columns have data
              const hasLoginS = r.agents.some(a => a.login_s > 0);
              const hasApprS = r.agents.some(a => a.approved_s > 0);
              const hasDisbS = r.agents.some(a => a.disbursed_s > 0);
              const hasInterimC = r.agents.some(a => a.interim_c > 0);
              const hasInterimS = r.agents.some(a => a.interim_s > 0);
              const hasFinalC = r.agents.some(a => a.final_c > 0);
              const hasFinalS = r.agents.some(a => a.final_s > 0);
              const hasApprAmt = r.agents.some(a => a.appr_amt > 0);
              const hasDisbAmt = r.agents.some(a => a.disb_amt > 0);
              const hasPipeline = r.agents.some(a => a.pipeline_amt > 0);

              return (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse" data-testid="gp-performance-table">
                  <tbody>
                    {r.agents.map((a, i) => {
                      const totalLogin = a.login_c + a.login_s;
                      const totalAppr = a.approved_c + a.approved_s;
                      const totalDisb = a.disbursed_c + a.disbursed_s;
                      const totalInterim = a.interim_c + a.interim_s;
                      const totalFinal = a.final_c + a.final_s;
                      return (
                      <React.Fragment key={i}>
                        {/* Row 1: Summary stats */}
                        <tr className={`${i > 0 ? 'border-t-2 border-slate-300' : ''} bg-slate-50`}>
                          <td className="p-1.5 border font-semibold text-sm" rowSpan="2" style={{ verticalAlign: 'top', minWidth: '140px' }}>
                            <div>{a.agent_name}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{a.agent_code}</div>
                          </td>
                          <td className="p-1 border text-center bg-blue-50">
                            <div className="font-bold text-base">{a.files_generated}</div>
                            <div className="text-[8px] text-slate-400">Files Gen.</div>
                          </td>
                          <td className="p-1 border text-center bg-indigo-50">
                            <div className="font-bold text-blue-600">{a.login_c}</div>
                            {a.login_s > 0 && <div className="text-[8px] text-orange-500">+{a.login_s} spill</div>}
                            <div className="text-[8px] text-slate-400">Login</div>
                          </td>
                          <td className="p-1 border text-center bg-green-50">
                            <div className="font-bold text-green-600">{a.approved_c}</div>
                            {a.approved_s > 0 && <div className="text-[8px] text-orange-500">+{a.approved_s} spill</div>}
                            <div className="text-[8px] text-slate-400">Approved</div>
                          </td>
                          <td className="p-1 border text-center bg-emerald-50">
                            <div className="font-bold text-green-700">{a.disbursed_c}</div>
                            {a.disbursed_s > 0 && <div className="text-[8px] text-orange-500">+{a.disbursed_s} spill</div>}
                            <div className="text-[8px] text-slate-400">Disbursed</div>
                          </td>
                          {(hasInterimC || hasInterimS) && (
                          <td className="p-1 border text-center bg-orange-50">
                            <div className="font-bold text-orange-600">{a.interim_c}</div>
                            {a.interim_s > 0 && <div className="text-[8px] text-orange-500">+{a.interim_s} spill</div>}
                            <div className="text-[8px] text-slate-400">Interim Rej</div>
                          </td>
                          )}
                          {(hasFinalC || hasFinalS) && (
                          <td className="p-1 border text-center bg-red-50">
                            <div className="font-bold text-red-600">{a.final_c}</div>
                            {a.final_s > 0 && <div className="text-[8px] text-orange-500">+{a.final_s} spill</div>}
                            <div className="text-[8px] text-slate-400">Final Rej</div>
                          </td>
                          )}
                          {hasApprAmt && (
                          <td className="p-1 border text-center">
                            <div className="font-bold text-purple-600">{a.appr_amt ? formatAmt(a.appr_amt) : '-'}</div>
                            <div className="text-[8px] text-slate-400">Appr. ₹</div>
                          </td>
                          )}
                          {hasDisbAmt && (
                          <td className="p-1 border text-center">
                            <div className="font-bold text-green-700">{a.disb_amt ? formatAmt(a.disb_amt) : '-'}</div>
                            <div className="text-[8px] text-slate-400">Disb. ₹</div>
                          </td>
                          )}
                          {hasPipeline && (
                          <td className="p-1 border text-center">
                            <div className="font-bold text-cyan-600">{a.pipeline_amt ? formatAmt(a.pipeline_amt) : '-'}</div>
                            <div className="text-[8px] text-slate-400">Pipeline ₹</div>
                          </td>
                          )}
                        </tr>
                        {/* Row 2: In-progress breakdown */}
                        <tr className="bg-white">
                          <td colSpan={2 + (hasInterimC||hasInterimS?1:0) + (hasFinalC||hasFinalS?1:0) + (hasApprAmt?1:0) + (hasDisbAmt?1:0) + (hasPipeline?1:0) + 3} className="p-1 border">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                              {activeCols.map(col => (
                                a[col.key] > 0 && <span key={col.key} className="text-slate-600"><span className="text-slate-400">{col.label}:</span> <b>{a[col.key]}</b></span>
                              ))}
                              {activeCols.every(col => !a[col.key]) && <span className="text-slate-300 italic">No in-progress files</span>}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                      );
                    })}
                    {/* Totals */}
                    <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
                      <td className="p-1.5 border text-sm">TOTAL</td>
                      <td className="p-1 border text-center bg-blue-50">{r.totals.files_generated}</td>
                      <td className="p-1 border text-center bg-indigo-50">
                        <span className="text-blue-600">{r.totals.login_c}</span>
                        {r.totals.login_s > 0 && <span className="text-orange-500 text-[9px]"> +{r.totals.login_s}</span>}
                      </td>
                      <td className="p-1 border text-center bg-green-50">
                        <span className="text-green-600">{r.totals.approved_c}</span>
                        {r.totals.approved_s > 0 && <span className="text-orange-500 text-[9px]"> +{r.totals.approved_s}</span>}
                      </td>
                      <td className="p-1 border text-center bg-emerald-50">
                        <span className="text-green-700">{r.totals.disbursed_c}</span>
                        {r.totals.disbursed_s > 0 && <span className="text-orange-500 text-[9px]"> +{r.totals.disbursed_s}</span>}
                      </td>
                      {(hasInterimC || hasInterimS) && <td className="p-1 border text-center text-orange-600 bg-orange-50">{r.totals.interim_c}{r.totals.interim_s > 0 && <span className="text-orange-500 text-[9px]"> +{r.totals.interim_s}</span>}</td>}
                      {(hasFinalC || hasFinalS) && <td className="p-1 border text-center text-red-600 bg-red-50">{r.totals.final_c}{r.totals.final_s > 0 && <span className="text-orange-500 text-[9px]"> +{r.totals.final_s}</span>}</td>}
                      {hasApprAmt && <td className="p-1 border text-center text-purple-600">{formatAmt(r.totals.appr_amt)}</td>}
                      {hasDisbAmt && <td className="p-1 border text-center text-green-700">{formatAmt(r.totals.disb_amt)}</td>}
                      {hasPipeline && <td className="p-1 border text-center text-cyan-600">{formatAmt(r.totals.pipeline_amt)}</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
              );
            })()}

            {/* Legend */}
            <div className="mt-3 text-[9px] text-slate-400 flex flex-wrap gap-x-4 gap-y-0.5">
              <span><b className="text-blue-600">C</b> = Current (created in period)</span>
              <span><b className="text-orange-500">S</b> = Spillover (created before, activity in period)</span>
              <span><b className="text-slate-500">Files Gen.</b> = Leads created in date range</span>
              <span><b className="text-slate-500">In Progress:</b> Contacted to Query/Hold (created date)</span>
              <span><b className="text-slate-500">Login:</b> Login + Approved + Declined + Not Disbursed + Rejected-after-login</span>
              <span><b className="text-slate-500">Interim Rej:</b> FI Negative + Declined + Cust. Not Interested/Supporting</span>
              <span><b className="text-slate-500">Final Rej:</b> Rejected + Not Eligible + Not Login + Not Disbursed</span>
              <span><b className="text-slate-500">Pipeline ₹:</b> Eligible Amt where Login=Yes & App ID filled, excl. disbursed/declined/rejected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPerformanceReport;

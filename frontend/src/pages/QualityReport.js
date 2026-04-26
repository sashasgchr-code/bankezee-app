import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import api from '@/utils/api';
import { ArrowLeft, Printer, Star, ChevronDown } from 'lucide-react';
import { LOAN_TYPES } from '@/utils/constants';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const LoanTypeMultiSelect = ({ selected = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggleType = (value) => {
    const next = selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value];
    onChange(next);
  };
  const label = selected.length === 0 ? 'All Loan Types'
    : selected.length === 1 ? LOAN_TYPES.find(t => t.value === selected[0])?.label || selected[0]
    : `${selected.length} types`;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-44 h-9 px-3 py-2 text-sm border rounded-md bg-white hover:bg-slate-50">
        <span className="truncate">{label}</span>
        <ChevronDown className="w-4 h-4 ml-1 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto p-2">
          <div className="flex justify-between mb-1 px-1">
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => onChange(LOAN_TYPES.map(t => t.value))}>Select All</button>
            <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onChange([])}>Clear</button>
          </div>
          {LOAN_TYPES.map(type => (
            <label key={type.value} className="flex items-center gap-2 px-1 py-1 hover:bg-slate-50 rounded cursor-pointer text-sm">
              <Checkbox checked={selected.includes(type.value)} onCheckedChange={() => toggleType(type.value)} />
              {type.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const Stars = ({ count }) => (
  <span className="inline-flex gap-px">
    {[1,2,3,4,5].map(i => (
      <Star key={i} className={`w-3 h-3 ${i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
    ))}
  </span>
);

export default function QualityReport() {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [selectedManager, setSelectedManager] = useState('all');
  const [selectedLoanType, setSelectedLoanType] = useState([]);
  const [managers, setManagers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/reports/managers-list').then(r => setManagers(r.data)).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (selectedManager !== 'all') params.append('manager_id', selectedManager);
      if (selectedLoanType.length > 0) params.append('loan_type', selectedLoanType.join(','));
      const res = await api.get(`/reports/quality-report?${params}`);
      setReport(res.data);
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
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const w = imgW * ratio;
      const h = imgH * ratio;
      pdf.addImage(imgData, 'JPEG', (pdfW - w) / 2, 5, w, h);
      pdf.save(`Quality_Report_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF exported');
    } catch { toast.error('PDF export failed'); }
    finally { setExporting(false); }
  };

  const r = report;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b sticky top-0 z-10 print:static">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="print:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800" data-testid="quality-report-title">Quality Report</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            {report && (
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Filters */}
        <Card className="mb-4 print:hidden" data-testid="quality-filters">
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
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Loan Type</p>
                <LoanTypeMultiSelect selected={selectedLoanType} onChange={setSelectedLoanType} />
              </div>
              <Button onClick={fetchReport} disabled={loading} className="h-9" data-testid="generate-quality-btn">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!report && !loading && (
          <div className="text-center py-20 text-slate-400">
            <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select filters and click Generate Report</p>
          </div>
        )}

        {report && (
          <div ref={reportRef} className="space-y-4 bg-white p-6 rounded-lg">
            <div className="text-center pb-4 border-b">
              <h2 className="text-xl font-bold text-slate-800">BANKEZEE - QUALITY REPORT</h2>
              <p className="text-sm text-slate-500">{fromDate} to {toDate}</p>
              <p className="text-xs text-slate-400 mt-1">{r.overall.total} total leads</p>
            </div>

            {/* Overall Distribution */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Overall Star Distribution</h3>
              <div className="grid grid-cols-5 gap-3 max-w-2xl">
                {[5,4,3,2,1].map(s => (
                  <div key={s} className="p-3 rounded-lg border bg-white text-center">
                    <Stars count={s} />
                    <p className="text-2xl font-bold mt-1">{r.overall[`star_${s}`]}</p>
                    <p className="text-[10px] text-slate-400">
                      {r.overall.total > 0 ? `${((r.overall[`star_${s}`] / r.overall.total) * 100).toFixed(1)}%` : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent-wise Table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Growth Partner Quality Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid="quality-table">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-2 border text-xs font-semibold">#</th>
                      <th className="text-left p-2 border text-xs font-semibold">Growth Partner</th>
                      <th className="text-center p-2 border text-xs font-semibold">Total Files</th>
                      <th className="text-center p-2 border text-xs font-semibold"><Stars count={5} /></th>
                      <th className="text-center p-2 border text-xs font-semibold"><Stars count={4} /></th>
                      <th className="text-center p-2 border text-xs font-semibold"><Stars count={3} /></th>
                      <th className="text-center p-2 border text-xs font-semibold"><Stars count={2} /></th>
                      <th className="text-center p-2 border text-xs font-semibold"><Stars count={1} /></th>
                      <th className="text-center p-2 border text-xs font-semibold">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.agents.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 border text-slate-400">{i + 1}</td>
                        <td className="p-2 border font-medium">{a.agent_name}</td>
                        <td className="p-2 border text-center font-semibold">{a.total}</td>
                        <td className="p-2 border text-center text-green-700 font-semibold">{a.star_5 || '-'}</td>
                        <td className="p-2 border text-center text-green-600">{a.star_4 || '-'}</td>
                        <td className="p-2 border text-center text-yellow-600">{a.star_3 || '-'}</td>
                        <td className="p-2 border text-center text-orange-600">{a.star_2 || '-'}</td>
                        <td className="p-2 border text-center text-red-600">{a.star_1 || '-'}</td>
                        <td className="p-2 border text-center">
                          <span className={`font-bold ${a.avg_score >= 75 ? 'text-green-700' : a.avg_score >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {a.avg_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {r.agents.length > 0 && (
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-2 border"></td>
                        <td className="p-2 border">TOTAL</td>
                        <td className="p-2 border text-center">{r.totals.total}</td>
                        <td className="p-2 border text-center text-green-700">{r.totals.star_5}</td>
                        <td className="p-2 border text-center text-green-600">{r.totals.star_4}</td>
                        <td className="p-2 border text-center text-yellow-600">{r.totals.star_3}</td>
                        <td className="p-2 border text-center text-orange-600">{r.totals.star_2}</td>
                        <td className="p-2 border text-center text-red-600">{r.totals.star_1}</td>
                        <td className="p-2 border text-center">{r.totals.avg_score}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {r.agents.length === 0 && (
                <p className="text-center text-slate-400 py-8">No data available for selected filters</p>
              )}
            </div>

            {/* Legend */}
            <div className="text-[10px] text-slate-400 leading-relaxed pt-2 border-t flex flex-wrap gap-x-4">
              <span><b className="text-slate-500">5 Star:</b> Score 90-100</span>
              <span><b className="text-slate-500">4 Star:</b> Score 75-89</span>
              <span><b className="text-slate-500">3 Star:</b> Score 60-74</span>
              <span><b className="text-slate-500">2 Star:</b> Score 45-59</span>
              <span><b className="text-slate-500">1 Star:</b> Score &lt;45</span>
              <span><b className="text-slate-500">Score:</b> Income (25) + CIBIL (25) + CIBIL Issues (15) + FOIR (15) + Company Type (20)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

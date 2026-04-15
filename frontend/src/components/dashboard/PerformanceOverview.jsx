import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, LabelList
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PerformanceOverview = ({ leads = [], stats = {} }) => {
  // Status distribution for pie chart
  const statusData = [
    { name: 'New', value: stats.newLeads || 0, color: '#3b82f6' },
    { name: 'In Progress', value: stats.inProgress || 0, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved || 0, color: '#22c55e' },
    { name: 'Disbursed', value: stats.disbursed || 0, color: '#10b981' },
    { name: 'Rejected', value: stats.finalRejections !== undefined ? (stats.finalRejections || 0) + (stats.interimRejects || 0) : (stats.rejected || 0), color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Monthly trend data (last 6 months)
  const getMonthlyData = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthLeads = leads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate.getMonth() === month && leadDate.getFullYear() === year;
      });
      
      const disbursedLeads = monthLeads.filter(l => l.status === 'disbursed');
      const disbursedAmount = disbursedLeads.reduce((sum, l) => {
        const elig = l.eligibilities?.find(e => e.disbursed === true);
        return sum + (elig?.disbursed_amount || 0);
      }, 0);
      
      months.push({
        name: monthName,
        leads: monthLeads.length,
        disbursed: disbursedLeads.length,
        amount: Math.round(disbursedAmount / 100000) // In lakhs
      });
    }
    
    return months;
  };

  // Loan type distribution
  const getLoanTypeData = () => {
    const typeCount = {};
    leads.forEach(l => {
      const type = l.additional_data?.type_of_loan || l.requirement || 'other';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    return Object.entries(typeCount)
      .map(([name, value]) => ({ 
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const monthlyData = getMonthlyData();
  const loanTypeData = getLoanTypeData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Lead Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lead Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} leads`, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" name="Leads" strokeWidth={2} />
              <Line type="monotone" dataKey="disbursed" stroke="#22c55e" name="Disbursed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loan Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Loans by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {loanTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={loanTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceOverview;

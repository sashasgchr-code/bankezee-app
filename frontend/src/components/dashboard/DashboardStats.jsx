import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, DollarSign, Clock, XCircle, TrendingUp, Banknote, LogIn, AlertTriangle } from 'lucide-react';

const formatAmount = (amount) => {
  if (!amount) return '₹0';
  const num = Number(amount);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString()}`;
};

const DashboardStats = ({ stats, earnings = {}, showEarnings = true, totalEligible = null }) => {
  const statCards = [
    { 
      title: 'Total Leads', 
      value: stats.total || 0, 
      icon: FileText, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      title: 'New', 
      value: stats.newLeads || 0, 
      icon: FileText, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'In Progress', 
      value: stats.inProgress || 0, 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: 'Created date'
    },
    {
      title: 'Login',
      value: stats.loginCount || 0,
      icon: LogIn,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      current: stats.loginCurrent,
      spillover: stats.loginSpillover
    },
    { 
      title: 'Approved', 
      value: stats.approved || 0, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      current: stats.approvedCurrent,
      spillover: stats.approvedSpillover
    },
    { 
      title: 'Total Approved', 
      value: formatAmount(stats.totalApprovedAmount),
      icon: TrendingUp, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isAmount: true,
      subtitle: 'Activity date'
    },
    { 
      title: 'Disbursed', 
      value: stats.disbursed || 0, 
      icon: Banknote, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      current: stats.disbursedCurrent,
      spillover: stats.disbursedSpillover
    },
    { 
      title: 'Total Disbursed', 
      value: formatAmount(stats.totalDisbursedAmount),
      icon: DollarSign, 
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      isAmount: true,
      subtitle: 'Activity date'
    },
    {
      title: 'Interim Rejects',
      value: stats.interimRejects || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      current: stats.interimRejectCurrent,
      spillover: stats.interimRejectSpillover
    },
    { 
      title: 'Final Rejections', 
      value: stats.finalRejections ?? stats.rejected ?? 0, 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      current: stats.finalRejectCurrent,
      spillover: stats.finalRejectSpillover
    }
  ];

  // Add Amount in Pipeline if provided
  if (totalEligible !== null) {
    statCards.push({
      title: 'Amt in Pipeline',
      value: formatAmount(stats.amountInPipeline),
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      isAmount: true,
      subtitle: 'Login=Yes & App ID'
    });
  }

  // Add earnings stats for Agent/Partner/Manager/TL dashboards
  if (showEarnings) {
    statCards.push(
      { 
        title: 'Total Earnings', 
        value: formatAmount(earnings.total_earnings),
        icon: TrendingUp, 
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        isAmount: true
      },
      { 
        title: 'This Month', 
        value: formatAmount(earnings.monthly_earnings),
        icon: DollarSign, 
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        isAmount: true
      }
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover-lift min-w-0" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-[11px] font-medium text-slate-600 leading-tight">{stat.title}</CardTitle>
            <div className={`p-1 rounded-full ${stat.bgColor} shrink-0`}>
              <stat.icon className={`h-3 w-3 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            <div className={`text-lg font-bold truncate ${stat.isAmount ? stat.color : ''}`}>
              {stat.value}
            </div>
            {(stat.current !== undefined || stat.spillover !== undefined) ? (
              <div className="text-[9px] mt-0.5 leading-tight">
                <span className="text-blue-600">C: {stat.current || 0}</span>
                {' '}
                <span className="text-orange-600">S: {stat.spillover || 0}</span>
              </div>
            ) : stat.subtitle ? (
              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{stat.subtitle}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;

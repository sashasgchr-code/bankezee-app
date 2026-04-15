import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, DollarSign, Clock, XCircle, TrendingUp, Banknote, LogIn, AlertTriangle, ShieldX } from 'lucide-react';

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
      subtitle: 'Based on created date'
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
      value: `₹${(stats.totalApprovedAmount || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isAmount: true,
      subtitle: 'Based on activity date'
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
      value: `₹${(stats.totalDisbursedAmount || 0).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      isAmount: true,
      subtitle: 'Based on activity date'
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
      value: stats.finalRejections || 0, 
      icon: XCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      current: stats.finalRejectCurrent,
      spillover: stats.finalRejectSpillover
    }
  ];

  // Add Amount in Pipeline (replaces Total Eligible) if provided
  if (totalEligible !== null) {
    statCards.push({
      title: 'Amt in Pipeline',
      value: `₹${(stats.amountInPipeline || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      isAmount: true,
      subtitle: 'Login=Yes & App ID filled'
    });
  }

  // Add earnings stats only if showEarnings is true (for Agent/Partner/Manager/TL dashboards)
  if (showEarnings) {
    statCards.push(
      { 
        title: 'Total Earnings', 
        value: `₹${(earnings.total_earnings || 0).toLocaleString()}`, 
        icon: TrendingUp, 
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        isAmount: true
      },
      { 
        title: 'This Month', 
        value: `₹${(earnings.monthly_earnings || 0).toLocaleString()}`, 
        icon: DollarSign, 
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        isAmount: true
      }
    );
  }

  const gridCols = showEarnings ? 'lg:grid-cols-5 xl:grid-cols-10' : 'lg:grid-cols-5 xl:grid-cols-10';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${gridCols} gap-4 mb-8`}>
      {statCards.map((stat, index) => (
        <Card key={index} className="hover-lift" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">{stat.title}</CardTitle>
            <div className={`p-1.5 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-xl font-bold ${stat.isAmount ? stat.color : ''}`}>
              {stat.value}
            </div>
            {(stat.current !== undefined || stat.spillover !== undefined) ? (
              <p className="text-[10px] mt-0.5">
                <span className="text-blue-600">Current: {stat.current || 0}</span>
                {' '}
                <span className="text-orange-600">Spillover: {stat.spillover || 0}</span>
              </p>
            ) : stat.subtitle ? (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{stat.subtitle}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;

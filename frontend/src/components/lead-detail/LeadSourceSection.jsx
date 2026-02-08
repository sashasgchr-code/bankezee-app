const LeadSourceSection = ({ 
  lead, 
  sourceInfo, 
  canEdit 
}) => {
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="pt-4 border-t">
      <h4 className="text-sm font-semibold text-primary mb-3">Lead Source & Status</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Source Type</p>
          <p className="font-medium capitalize">{lead.source || '-'}</p>
        </div>
        {sourceInfo && canEdit && (
          <>
            <div>
              <p className="text-xs text-slate-500 mb-1">{sourceInfo.type} Name</p>
              <p className="font-medium">{sourceInfo.full_name || sourceInfo.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{sourceInfo.type} Code</p>
              <p className="font-medium text-primary">{sourceInfo.agent_code || sourceInfo.referral_code || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{sourceInfo.type} Contact</p>
              <p className="font-medium">{sourceInfo.phone || sourceInfo.mobile || '-'}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs text-slate-500 mb-1">Current Status</p>
          <span className={`text-sm px-2 py-1 rounded-full capitalize ${getStatusBadgeClass(lead.status)}`}>
            {(lead.status || 'new').replace(/_/g, ' ')}
          </span>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Created</p>
          <p className="font-medium">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</p>
        </div>
      </div>
    </div>
  );
};

export default LeadSourceSection;

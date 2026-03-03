import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Intelligence Path Error" 
        subtitle="The requested path does not exist in the CRM core."
      />
      
      <SectionCard>
        <EmptyState 
          icon={AlertCircle}
          title="404 - Node Not Found"
          description="The intelligence path you are trying to access does not exist or has been relocated within the IndiaGrain infrastructure."
          ctaText="Return to Command Center"
          onCtaClick={() => navigate('/')}
        />
      </SectionCard>
    </div>
  );
};

export default NotFoundPage;

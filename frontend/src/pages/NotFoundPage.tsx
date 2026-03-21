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
        title="Page Not Found"
        subtitle="The page you requested could not be found."
      />

      <SectionCard>
        <EmptyState
          icon={AlertCircle}
          title="404 - Not Found"
          description="The page you are looking for does not exist or has been moved."
          ctaText="Return to Dashboard"
          onCtaClick={() => navigate('/')}
        />
      </SectionCard>
    </div>
  );
};

export default NotFoundPage;

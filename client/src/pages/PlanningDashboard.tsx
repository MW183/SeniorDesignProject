import React, { useRef } from 'react';
import Card from '../components/ui/Card';
import CreateWeddingForm from '../components/CreateWeddingForm';
import WeddingList from '../components/WeddingList';

export default function PlanningDashboard({ currentUser }: { currentUser?: any }) {
  const weddingListRef = useRef<{ load: () => void }>(null);

  const handleWeddingCreated = () => {
    weddingListRef.current?.load();
  };

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Planning Dashboard</h2>
        <p className="text-slate-400">Welcome, {currentUser?.name}!</p>
      </Card>

      <CreateWeddingForm onWeddingCreated={handleWeddingCreated} />
      <WeddingList ref={weddingListRef} currentUser={currentUser} />
    </div>
  );
}

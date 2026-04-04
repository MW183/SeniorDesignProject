import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateWeddingForm from '../../components/CreateWeddingForm';

export default function CreateWedding() {
  const navigate = useNavigate();

  const handleWeddingCreated = (weddingId?: string) => {
    // Navigate back to manage weddings after creation
    navigate('/manage-weddings');
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <CreateWeddingForm onWeddingCreated={handleWeddingCreated} />
    </div>
  );
}

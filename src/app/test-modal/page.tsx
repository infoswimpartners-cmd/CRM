'use client';
import React, { useState } from 'react';
import TrioAccessModal from '@/components/trio/TrioAccessModal';
import { Button } from '@/components/ui/button';

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="p-20 flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <h1 className="text-3xl font-black mb-8">Modal Design Test</h1>
      <Button onClick={() => setIsOpen(true)}>Open Access Modal</Button>
      <TrioAccessModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        facilityName="ヤエスク" 
      />
    </div>
  );
}

import React from 'react';
import { GameInterface } from './components/GameInterface';

const App: React.FC = () => {
  return (
    <div className="font-sans text-stone-900 bg-stone-100 min-h-screen">
      <GameInterface />
    </div>
  );
};

export default App;

import { createContext, useContext } from 'react';

type ExperimentProgressType = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface ExperimentContextType {
  progress: ExperimentProgressType;
}

const ExperimentContext = createContext<ExperimentContextType>({
  progress: -1,
});

export default function ExperimentContextProvider({
  value,
  children,
}: {
  value: ExperimentContextType;
  children: React.ReactNode;
}) {
  return (
    <ExperimentContext.Provider value={value}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error(
      'useExperiment must be used within an ExperimentContextProvider.'
    );
  }
  return context;
}

import { createContext, useContext, useState } from "react";

const BoardEditContext = createContext(null);

export function BoardEditProvider({ children }) {
  const [editMode, setEditMode] = useState(false);
  return (
    <BoardEditContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </BoardEditContext.Provider>
  );
}

export function useBoardEdit() {
  return useContext(BoardEditContext);
}

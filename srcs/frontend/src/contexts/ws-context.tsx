import { createContext, useContext, ReactNode } from "react";
import { useWs, type ServerMsg } from "@/hooks/use-ws";

type MsgHandler = (msg: ServerMsg) => void;

interface WsContextType {
  send: (msg: any) => void;
  onMessage: (handler: MsgHandler) => () => void;
  connected: boolean;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const { send, onMessage, connected } = useWs(token);

  return (
    <WsContext.Provider value={{ send, onMessage, connected }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWsContext() {
  const context = useContext(WsContext);
  if (!context) {
    throw new Error("useWsContext must be used within WsProvider");
  }
  return context;
}

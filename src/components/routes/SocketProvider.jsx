import { createContext, useContext, useEffect, useState } from "react";
import initSocket, { disconnectSocket } from "../../services/socketConntection";
import { getTenantId } from "../../utils/functions/tokenEncryption";
import { getDispatcherId } from "../../utils/auth";
import { useAppSelector } from "../../store";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const signedIn = useAppSelector((state) => state.auth.session.signedIn);
  const tenantId = getTenantId();
  const dispatcherId = getDispatcherId();

  useEffect(() => {
    if (!signedIn || !tenantId || !dispatcherId) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = initSocket();

    if (!socketInstance) {
      console.error("Socket initialization failed");
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const handleConnect = () => {
      console.log("✅ Socket connected in Provider:", socketInstance.id);
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected in Provider");
      setIsConnected(false);
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
    };
  }, [signedIn, tenantId, dispatcherId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context?.socket || null;
};

export const useSocketStatus = () => {
  const context = useContext(SocketContext);
  return context?.isConnected || false;
};

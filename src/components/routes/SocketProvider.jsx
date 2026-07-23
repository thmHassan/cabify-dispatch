import { createContext, useContext, useEffect, useState } from "react";
import initSocket, { disconnectSocket } from "../../services/socketConntection";
import { getTenantId } from "../../utils/functions/tokenEncryption";
import { getDispatcherId } from "../../utils/auth";
import { useAppSelector } from "../../store";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [companySettingsRevision, setCompanySettingsRevision] = useState(0);
  const [lastCompanySettingsChange, setLastCompanySettingsChange] = useState(null);
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

    const handleCompanySettingsChanged = (payload) => {
      setLastCompanySettingsChange(payload || null);
      setCompanySettingsRevision((revision) => revision + 1);
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("company-settings-changed", handleCompanySettingsChanged);
    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("company-settings-changed", handleCompanySettingsChanged);
    };
  }, [signedIn, tenantId, dispatcherId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, companySettingsRevision, lastCompanySettingsChange }}>
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

export const useCompanySettingsRevision = () => {
  const context = useContext(SocketContext);
  return context?.companySettingsRevision || 0;
};

export const useLastCompanySettingsChange = () => {
  const context = useContext(SocketContext);
  return context?.lastCompanySettingsChange || null;
};

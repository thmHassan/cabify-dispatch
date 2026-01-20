import { createContext, useContext, useEffect, useState } from "react";
import initSocket from "../../services/socketConntection";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = initSocket();
    
    if (!socketInstance) {
      console.error("Socket initialization failed");
      return;
    }

    // Socket connect thaya pachi j state update karo
    socketInstance.on("connect", () => {
      console.log("✅ Socket connected in Provider:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Socket disconnected in Provider");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.off("connect");
        socketInstance.off("disconnect");
        // socketInstance.disconnect();
      }
    };
  }, []);

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
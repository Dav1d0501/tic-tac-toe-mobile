import { io } from "socket.io-client";
import { SERVER_URL } from "./config";

// One shared socket connection used by every screen
const socket = io(SERVER_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;

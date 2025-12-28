import { WebSocket } from "ws";
import { RoomManagerInstance } from "../RoomManager.js";

interface User {
    userId: string;
    name: string;
    ws: WebSocket;
}

interface JoinRoomMessage {
    type: "join_room";
    roomId: string;
}

export function handleJoinRoom(message: JoinRoomMessage, user: User): void {
    const { roomId } = message;



    RoomManagerInstance.addUser(roomId, user);

    // Send current room users to the new user
    const users = RoomManagerInstance.getUsers(roomId);


    user.ws.send(JSON.stringify({
        type: "room_users",
        users: users.filter(u => u.userId !== user.userId)
    }));
}

interface LeaveRoomMessage {
    type: "leave_room";
    roomId: string;
}

export function handleLeaveRoom(message: LeaveRoomMessage, user: User): void {
    const { roomId } = message;

    RoomManagerInstance.removeUser(roomId, user);
}

import { WebSocket } from "ws"

interface User {
    userId: string,
    name: string,
    ws: WebSocket
}

export class RoomManager {
    private rooms: Map<string, User[]> = new Map()

    addUser(roomId: string, user: User) {
        // Ensure roomId is a string key
        const roomKey = String(roomId);

        if (!this.rooms.has(roomKey)) {
            this.rooms.set(roomKey, []);
        }
        this.rooms.get(roomKey)?.push(user);

        // Notify others that a new user joined
        this.broadcastToOthers(roomKey, user.userId, JSON.stringify({
            type: "user_joined",
            userId: user.userId,
            name: user.name
        }));
    }

    removeUser(roomId: string, user: User) {
        const roomKey = String(roomId);

        if (!this.rooms.has(roomKey)) {
            return;
        }

        const users = this.rooms.get(roomKey)?.filter(u => u.userId !== user.userId);

        if (users && users.length === 0) {
            this.rooms.delete(roomKey);
        } else if (users) {
            this.rooms.set(roomKey, users);
        }

        // Notify others that user left
        this.broadcast(roomKey, JSON.stringify({
            type: "user_left",
            userId: user.userId
        }));
    }

    getUsers(roomId: string): { userId: string; name: string }[] {
        const roomKey = String(roomId);
        const users = this.rooms.get(roomKey) || [];
        return users.map(u => ({ userId: u.userId, name: u.name }));
    }

    broadcast(roomId: string, message: string) {
        const roomKey = String(roomId);
        const users = this.rooms.get(roomKey);

        users?.forEach(u => {
            const ws = u.ws;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        })
    }

    broadcastToOthers(roomId: string, excludeUserId: string, message: string) {
        const roomKey = String(roomId);
        const users = this.rooms.get(roomKey);

        users?.forEach(u => {
            if (u.userId !== excludeUserId && u.ws.readyState === WebSocket.OPEN) {
                u.ws.send(message);
            }
        })
    }
}

export const RoomManagerInstance = new RoomManager();

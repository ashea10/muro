import z from "zod";

// ============ Authentication Schemas ============
export const CreateUserSchema = z.object({
    username: z.string().min(3).max(50).email("Invalid email format"),
    password: z.string().min(6).max(100),
    name: z.string().min(1).max(50)
});

export const SigninSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string(),
});

// ============ Room Schemas ============
export const CreateRoomSchema = z.object({
    name: z.string().min(3).max(50)
});

// ============ Shape Schemas ============

// Base shape properties
const BaseShapeProps = z.object({
    id: z.string().optional(),
    color: z.string().optional(),
    strokeWidth: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
});

export const RectSchema = BaseShapeProps.extend({
    type: z.literal("rect"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

export const CircleSchema = BaseShapeProps.extend({
    type: z.literal("circle"),
    centerX: z.number(),
    centerY: z.number(),
    radius: z.number(),
});

export const PencilSchema = BaseShapeProps.extend({
    type: z.literal("pencil"),
    points: z.array(z.object({
        x: z.number(),
        y: z.number()
    })),
});

export const LineSchema = BaseShapeProps.extend({
    type: z.literal("line"),
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
});

export const ArrowSchema = BaseShapeProps.extend({
    type: z.literal("arrow"),
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    headSize: z.number().optional(),
});

export const TextSchema = BaseShapeProps.extend({
    type: z.literal("text"),
    x: z.number(),
    y: z.number(),
    content: z.string(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
});

export const StickyNoteSchema = BaseShapeProps.extend({
    type: z.literal("sticky"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    content: z.string(),
    backgroundColor: z.string().optional(),
});

export const ImageSchema = BaseShapeProps.extend({
    type: z.literal("image"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    src: z.string(),
});

// Union of all shape types
export const ShapeSchema = z.union([
    RectSchema,
    CircleSchema,
    PencilSchema,
    LineSchema,
    ArrowSchema,
    TextSchema,
    StickyNoteSchema,
    ImageSchema
]);

// ============ WebSocket Message Schemas ============
export const JoinRoomMessage = z.object({
    type: z.literal("join_room"),
    roomId: z.string()
});

export const LeaveRoomMessage = z.object({
    type: z.literal("leave_room"),
    roomId: z.string()
});



export const DrawMessage = z.object({
    type: z.literal("draw"),
    roomId: z.string(),
    shape: ShapeSchema
});

export const DeleteMessage = z.object({
    type: z.literal("delete"),
    roomId: z.string(),
    shapeId: z.string()
});

export const ClearMessage = z.object({
    type: z.literal("clear"),
    roomId: z.string()
});

export const CursorMessage = z.object({
    type: z.literal("cursor"),
    roomId: z.string(),
    x: z.number(),
    y: z.number()
});

// ============ Type Exports ============
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Signin = z.infer<typeof SigninSchema>;
export type CreateRoom = z.infer<typeof CreateRoomSchema>;

export type Rect = z.infer<typeof RectSchema>;
export type Circle = z.infer<typeof CircleSchema>;
export type Pencil = z.infer<typeof PencilSchema>;
export type Line = z.infer<typeof LineSchema>;
export type Arrow = z.infer<typeof ArrowSchema>;
export type Text = z.infer<typeof TextSchema>;
export type StickyNote = z.infer<typeof StickyNoteSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type Shape = z.infer<typeof ShapeSchema>;

export type JoinRoom = z.infer<typeof JoinRoomMessage>;
export type LeaveRoom = z.infer<typeof LeaveRoomMessage>;

export type Draw = z.infer<typeof DrawMessage>;
export type Delete = z.infer<typeof DeleteMessage>;
export type Clear = z.infer<typeof ClearMessage>;
export type Cursor = z.infer<typeof CursorMessage>;

// ============ Tool Type ============
export type Tool =
    | "select"
    | "rect"
    | "circle"
    | "pencil"
    | "line"
    | "arrow"
    | "text"
    | "sticky"
    | "eraser"
    | "pan";

// ============ Selection Types ============
export interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

// ============ Viewport Types ============
export interface Viewport {
    x: number;
    y: number;
    scale: number;
}
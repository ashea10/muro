import { Tool, Shape, Viewport, Point, SelectionBox } from "../types.js";

export type WebSocketMessage = {
    type: "draw";
    shape: Shape;
    roomId: string;
} | {
    type: "delete";
    shapeId: string;
    roomId: string;
} | {
    type: "clear";
    roomId: string;
} | {
    type: "init";
    shapes: Shape[];
};

interface HistoryState {
    shapes: Shape[];
}

interface GameOptions {
    backgroundColor?: string;
    gridSize?: number;
    showGrid?: boolean;
}

// Generate UUID for shape IDs
function generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[];
    private roomId: string;
    private socket: WebSocket;

    // Interaction state
    private isMouseDown: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private lastX: number = 0;
    private lastY: number = 0;

    // Tool state
    private selectedTool: Tool = "rect";
    private strokeColor: string = "#FFFFFF";
    private strokeWidth: number = 2;
    private currentPencilPoints: Point[] | null = null;

    // Selection state
    private selectedShapeIds: Set<string> = new Set();
    private selectionBox: SelectionBox | null = null;
    private isMovingSelection: boolean = false;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    // Viewport for pan/zoom
    private viewport: Viewport = { x: 0, y: 0, scale: 1 };
    private isPanning: boolean = false;

    // Undo/Redo
    private undoStack: HistoryState[] = [];
    private redoStack: HistoryState[] = [];
    private maxHistorySize: number = 50;

    // Options
    private options: GameOptions;

    // Event callbacks
    public onViewportChange?: (viewport: Viewport) => void;
    public onSelectionChange?: (selectedIds: string[]) => void;
    public onToolChange?: (tool: Tool) => void;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket, options: GameOptions = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.shapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.options = {
            backgroundColor: "#0a0a0a",
            gridSize: 20,
            showGrid: false,
            ...options
        };

        this.initHandlers();
        this.initMouseHandlers();
        this.initKeyboardHandlers();
        this.initWheelHandler();
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.onMouseDown);
        this.canvas.removeEventListener("mouseup", this.onMouseUp);
        this.canvas.removeEventListener("mousemove", this.onMouseMove);
        this.canvas.removeEventListener("wheel", this.onWheel);
        this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
        document.removeEventListener("keydown", this.onKeyDown);
    }

    // ==================== Public API ====================

    setShapes(shapes: Shape[]) {
        // Ensure all shapes have IDs
        this.shapes = shapes.map(s => ({
            ...s,
            id: s.id || generateId()
        }));
        this.render();
    }

    getShapes(): Shape[] {
        return [...this.shapes];
    }

    setTool(tool: Tool) {
        this.selectedTool = tool;
        this.clearSelection();
        this.updateCursor();
        this.onToolChange?.(tool);
    }

    getTool(): Tool {
        return this.selectedTool;
    }

    setColor(color: string) {
        this.strokeColor = color;
        // Update selected shapes' color
        if (this.selectedShapeIds.size > 0) {
            this.saveState();
            this.shapes = this.shapes.map(s =>
                this.selectedShapeIds.has(s.id || "")
                    ? { ...s, color }
                    : s
            );
            this.render();
        }
    }

    getColor(): string {
        return this.strokeColor;
    }

    setStrokeWidth(width: number) {
        this.strokeWidth = width;
        // Update selected shapes
        if (this.selectedShapeIds.size > 0) {
            this.saveState();
            this.shapes = this.shapes.map(s =>
                this.selectedShapeIds.has(s.id || "")
                    ? { ...s, strokeWidth: width }
                    : s
            );
            this.render();
        }
    }

    getViewport(): Viewport {
        return { ...this.viewport };
    }

    setViewport(viewport: Partial<Viewport>) {
        this.viewport = { ...this.viewport, ...viewport };
        this.render();
        this.onViewportChange?.(this.viewport);
    }

    zoomIn() {
        this.setViewport({ scale: Math.min(this.viewport.scale * 1.2, 5) });
    }

    zoomOut() {
        this.setViewport({ scale: Math.max(this.viewport.scale / 1.2, 0.1) });
    }

    resetView() {
        this.setViewport({ x: 0, y: 0, scale: 1 });
    }

    getSelectedShapeIds(): string[] {
        return Array.from(this.selectedShapeIds);
    }

    deleteSelected() {
        if (this.selectedShapeIds.size === 0) return;

        this.saveState();

        const idsToDelete = Array.from(this.selectedShapeIds);
        this.shapes = this.shapes.filter(s => !this.selectedShapeIds.has(s.id || ""));

        // Notify server about deletions
        idsToDelete.forEach(id => {
            this.socket.send(JSON.stringify({
                type: "delete",
                roomId: this.roomId,
                shapeId: id
            }));
        });

        this.clearSelection();
        this.render();
    }

    clearCanvas() {
        if (this.shapes.length === 0) return;

        this.saveState();
        this.shapes = [];

        this.socket.send(JSON.stringify({
            type: "clear",
            roomId: this.roomId
        }));

        this.clearSelection();
        this.render();
    }

    // ==================== Export ====================

    exportToPNG(): string {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement("canvas");
        const bounds = this.getShapesBounds();
        const padding = 40;

        exportCanvas.width = bounds.width + padding * 2;
        exportCanvas.height = bounds.height + padding * 2;

        const exportCtx = exportCanvas.getContext("2d")!;

        // Fill background
        exportCtx.fillStyle = this.options.backgroundColor!;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw shapes with offset
        exportCtx.translate(-bounds.x + padding, -bounds.y + padding);
        this.drawShapes(exportCtx, this.shapes);

        return exportCanvas.toDataURL("image/png");
    }

    exportToSVG(): string {
        const bounds = this.getShapesBounds();
        const padding = 40;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}">`;
        svg += `<rect width="100%" height="100%" fill="${this.options.backgroundColor}"/>`;
        svg += `<g transform="translate(${-bounds.x + padding}, ${-bounds.y + padding})">`;

        this.shapes.forEach(shape => {
            svg += this.shapeToSVG(shape);
        });

        svg += "</g></svg>";
        return svg;
    }

    private shapeToSVG(shape: Shape): string {
        const color = shape.color || this.strokeColor;
        const strokeWidth = shape.strokeWidth || this.strokeWidth;

        switch (shape.type) {
            case "rect":
                return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            case "circle":
                return `<circle cx="${shape.centerX}" cy="${shape.centerY}" r="${shape.radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            case "line":
                return `<line x1="${shape.startX}" y1="${shape.startY}" x2="${shape.endX}" y2="${shape.endY}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            case "pencil":
                if (shape.points.length < 2 || !shape.points[0]) return "";
                const firstPoint = shape.points[0];
                const d = `M ${firstPoint.x} ${firstPoint.y} ` +
                    shape.points.slice(1).map((p: Point) => `L ${p.x} ${p.y}`).join(" ");
                return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            case "text":
                return `<text x="${shape.x}" y="${shape.y}" fill="${color}" font-size="${shape.fontSize || 16}">${shape.content}</text>`;
            default:
                return "";
        }
    }

    private getShapesBounds(): { x: number; y: number; width: number; height: number } {
        if (this.shapes.length === 0) {
            return { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.shapes.forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // ==================== Undo/Redo ====================

    private saveState() {
        const state: HistoryState = {
            shapes: JSON.parse(JSON.stringify(this.shapes))
        };
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo(): boolean {
        if (this.undoStack.length === 0) return false;

        const currentState: HistoryState = {
            shapes: JSON.parse(JSON.stringify(this.shapes))
        };
        this.redoStack.push(currentState);

        const prevState = this.undoStack.pop()!;
        this.shapes = prevState.shapes;
        this.clearSelection();
        this.render();
        return true;
    }

    redo(): boolean {
        if (this.redoStack.length === 0) return false;

        const currentState: HistoryState = {
            shapes: JSON.parse(JSON.stringify(this.shapes))
        };
        this.undoStack.push(currentState);

        const nextState = this.redoStack.pop()!;
        this.shapes = nextState.shapes;
        this.clearSelection();
        this.render();
        return true;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    // ==================== Selection ====================

    private clearSelection() {
        this.selectedShapeIds.clear();
        this.selectionBox = null;
        this.onSelectionChange?.([]);
    }

    private selectShape(shapeId: string, addToSelection: boolean = false) {
        if (!addToSelection) {
            this.selectedShapeIds.clear();
        }
        this.selectedShapeIds.add(shapeId);
        this.onSelectionChange?.(Array.from(this.selectedShapeIds));
    }

    private findShapeAtPoint(x: number, y: number): Shape | null {
        // Check from top to bottom (last drawn = on top)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (shape && this.isPointInShape(x, y, shape)) {
                return shape;
            }
        }
        return null;
    }

    private isPointInShape(x: number, y: number, shape: Shape): boolean {
        const tolerance = 10;

        switch (shape.type) {
            case "rect":
                return x >= shape.x - tolerance &&
                    x <= shape.x + shape.width + tolerance &&
                    y >= shape.y - tolerance &&
                    y <= shape.y + shape.height + tolerance;

            case "circle":
                const dx = x - shape.centerX;
                const dy = y - shape.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return Math.abs(dist - shape.radius) <= tolerance;

            case "line":
            case "arrow":
                return this.isPointNearLine(x, y, shape.startX, shape.startY, shape.endX, shape.endY, tolerance);

            case "pencil":
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const pointA = shape.points[i];
                    const pointB = shape.points[i + 1];
                    if (pointA && pointB && this.isPointNearLine(x, y,
                        pointA.x, pointA.y,
                        pointB.x, pointB.y, tolerance)) {
                        return true;
                    }
                }
                return false;

            case "text":
            case "sticky":
                return x >= shape.x && x <= shape.x + (shape.type === "sticky" ? shape.width : 100) &&
                    y >= shape.y - 20 && y <= shape.y + (shape.type === "sticky" ? shape.height : 20);

            default:
                return false;
        }
    }

    private isPointNearLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number, tolerance: number): boolean {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = x1; yy = y1;
        } else if (param > 1) {
            xx = x2; yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
    }

    private getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
        switch (shape.type) {
            case "rect":
                return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
            case "circle":
                return {
                    x: shape.centerX - shape.radius,
                    y: shape.centerY - shape.radius,
                    width: shape.radius * 2,
                    height: shape.radius * 2
                };
            case "line":
            case "arrow":
                return {
                    x: Math.min(shape.startX, shape.endX),
                    y: Math.min(shape.startY, shape.endY),
                    width: Math.abs(shape.endX - shape.startX),
                    height: Math.abs(shape.endY - shape.startY)
                };
            case "pencil":
                if (shape.points.length === 0 || !shape.points[0]) return { x: 0, y: 0, width: 0, height: 0 };
                const firstPt = shape.points[0];
                let minX = firstPt.x, maxX = firstPt.x;
                let minY = firstPt.y, maxY = firstPt.y;
                shape.points.forEach((p: Point) => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });
                return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            case "text":
                return { x: shape.x, y: shape.y - 16, width: 100, height: 20 };
            case "sticky":
                return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
            default:
                return { x: 0, y: 0, width: 0, height: 0 };
        }
    }

    // ==================== Coordinate Transform ====================

    private screenToWorld(x: number, y: number): Point {
        return {
            x: (x - this.viewport.x) / this.viewport.scale,
            y: (y - this.viewport.y) / this.viewport.scale
        };
    }

    private worldToScreen(x: number, y: number): Point {
        return {
            x: x * this.viewport.scale + this.viewport.x,
            y: y * this.viewport.scale + this.viewport.y
        };
    }

    // ==================== Rendering ====================

    render() {
        const ctx = this.ctx;
        const { width, height } = this.canvas;

        // Clear canvas
        ctx.fillStyle = this.options.backgroundColor!;
        ctx.fillRect(0, 0, width, height);

        // Optional grid
        if (this.options.showGrid) {
            this.drawGrid();
        }

        // Save context and apply viewport transform
        ctx.save();
        ctx.translate(this.viewport.x, this.viewport.y);
        ctx.scale(this.viewport.scale, this.viewport.scale);

        // Draw all shapes
        this.drawShapes(ctx, this.shapes);

        // Draw current in-progress shape
        this.drawCurrentShape();

        // Draw selection highlights
        this.drawSelectionHighlights();

        // Draw selection box
        if (this.selectionBox) {
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 1 / this.viewport.scale;
            ctx.setLineDash([5 / this.viewport.scale, 5 / this.viewport.scale]);
            ctx.strokeRect(this.selectionBox.x, this.selectionBox.y, this.selectionBox.width, this.selectionBox.height);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    private drawGrid() {
        const ctx = this.ctx;
        const gridSize = this.options.gridSize! * this.viewport.scale;
        const offsetX = this.viewport.x % gridSize;
        const offsetY = this.viewport.y % gridSize;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        for (let x = offsetX; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }

    private drawShapes(ctx: CanvasRenderingContext2D, shapes: Shape[]) {
        shapes.forEach(shape => {
            const color = shape.color || "#FFFFFF";
            const strokeWidth = shape.strokeWidth || this.strokeWidth;

            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            switch (shape.type) {
                case "rect":
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                    break;

                case "circle":
                    ctx.beginPath();
                    ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case "line":
                    ctx.beginPath();
                    ctx.moveTo(shape.startX, shape.startY);
                    ctx.lineTo(shape.endX, shape.endY);
                    ctx.stroke();
                    break;

                case "arrow":
                    this.drawArrow(ctx, shape.startX, shape.startY, shape.endX, shape.endY, color, strokeWidth);
                    break;

                case "pencil":
                    if (shape.points.length > 0 && shape.points[0]) {
                        const pencilStart = shape.points[0];
                        ctx.beginPath();
                        ctx.moveTo(pencilStart.x, pencilStart.y);
                        shape.points.forEach((p: Point) => ctx.lineTo(p.x, p.y));
                        ctx.stroke();
                    }
                    break;

                case "text":
                    ctx.fillStyle = color;
                    ctx.font = `${shape.fontSize || 16}px ${shape.fontFamily || "sans-serif"}`;
                    ctx.fillText(shape.content, shape.x, shape.y);
                    break;

                case "sticky":
                    ctx.fillStyle = shape.backgroundColor || "#FEF08A";
                    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                    if (shape.content) {
                        ctx.fillStyle = "#000";
                        ctx.font = "14px sans-serif";
                        ctx.fillText(shape.content, shape.x + 8, shape.y + 20);
                    }
                    break;
            }
        });
    }

    private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number) {
        const headLen = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    private drawCurrentShape() {
        if (!this.isMouseDown) return;

        const ctx = this.ctx;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;

        const startWorld = this.screenToWorld(this.startX, this.startY);
        const currentWorld = this.screenToWorld(this.lastX, this.lastY);

        const width = currentWorld.x - startWorld.x;
        const height = currentWorld.y - startWorld.y;

        switch (this.selectedTool) {
            case "rect":
                ctx.strokeRect(startWorld.x, startWorld.y, width, height);
                break;
            case "circle":
                const radius = Math.sqrt(width * width + height * height) / 2;
                ctx.beginPath();
                ctx.arc(startWorld.x + width / 2, startWorld.y + height / 2, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case "line":
                ctx.beginPath();
                ctx.moveTo(startWorld.x, startWorld.y);
                ctx.lineTo(currentWorld.x, currentWorld.y);
                ctx.stroke();
                break;
            case "arrow":
                this.drawArrow(ctx, startWorld.x, startWorld.y, currentWorld.x, currentWorld.y, this.strokeColor, this.strokeWidth);
                break;
            case "pencil":
                if (this.currentPencilPoints && this.currentPencilPoints.length > 0 && this.currentPencilPoints[0]) {
                    const startPoint = this.currentPencilPoints[0];
                    ctx.beginPath();
                    ctx.moveTo(startPoint.x, startPoint.y);
                    this.currentPencilPoints.forEach(p => ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                }
                break;
        }
    }

    private drawSelectionHighlights() {
        if (this.selectedShapeIds.size === 0) return;

        const ctx = this.ctx;
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2 / this.viewport.scale;
        ctx.setLineDash([5 / this.viewport.scale, 5 / this.viewport.scale]);

        this.shapes.filter(s => this.selectedShapeIds.has(s.id || "")).forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
        });

        ctx.setLineDash([]);
    }

    private updateCursor() {
        switch (this.selectedTool) {
            case "select":
                this.canvas.style.cursor = "default";
                break;
            case "pan":
                this.canvas.style.cursor = this.isPanning ? "grabbing" : "grab";
                break;
            case "eraser":
                this.canvas.style.cursor = "crosshair";
                break;
            case "text":
                this.canvas.style.cursor = "text";
                break;
            default:
                this.canvas.style.cursor = "crosshair";
        }
    }

    // ==================== Event Handlers ====================

    initHandlers() {
        this.socket.addEventListener("message", (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "draw") {
                    const shape = { ...message.shape, id: message.shape.id || generateId() };
                    this.shapes.push(shape);
                    this.render();
                } else if (message.type === "delete") {
                    this.shapes = this.shapes.filter(s => s.id !== message.shapeId);
                    this.selectedShapeIds.delete(message.shapeId);
                    this.render();
                } else if (message.type === "clear") {
                    this.shapes = [];
                    this.clearSelection();
                    this.render();
                }
            } catch (e) {
                console.error("Failed to parse websocket message", e);
            }
        });
    }

    private onKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
            e.preventDefault();
            this.redo();
        }

        // Delete/Backspace: Delete selected
        if ((e.key === "Delete" || e.key === "Backspace") && this.selectedShapeIds.size > 0) {
            e.preventDefault();
            this.deleteSelected();
        }

        // Escape: Clear selection
        if (e.key === "Escape") {
            this.clearSelection();
            this.render();
        }

        // Space: Temporarily enable pan
        if (e.key === " " && !this.isMouseDown) {
            this.canvas.style.cursor = "grab";
        }
    };

    private onMouseDown = (e: MouseEvent) => {
        this.isMouseDown = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        const worldPoint = this.screenToWorld(e.clientX, e.clientY);

        // Handle pan mode
        if (this.selectedTool === "pan" || e.button === 1 || e.getModifierState("Space")) {
            this.isPanning = true;
            this.canvas.style.cursor = "grabbing";
            return;
        }

        // Handle select mode
        if (this.selectedTool === "select") {
            const shape = this.findShapeAtPoint(worldPoint.x, worldPoint.y);

            if (shape && shape.id) {
                if (e.shiftKey) {
                    // Toggle selection
                    if (this.selectedShapeIds.has(shape.id)) {
                        this.selectedShapeIds.delete(shape.id);
                    } else {
                        this.selectedShapeIds.add(shape.id);
                    }
                } else if (!this.selectedShapeIds.has(shape.id)) {
                    // Select only this shape
                    this.clearSelection();
                    this.selectShape(shape.id);
                }

                // Start moving if we have selection
                if (this.selectedShapeIds.size > 0) {
                    this.isMovingSelection = true;
                }
            } else {
                // Start selection box
                if (!e.shiftKey) {
                    this.clearSelection();
                }
                this.selectionBox = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 };
            }
            this.render();
            return;
        }

        // Handle eraser
        if (this.selectedTool === "eraser") {
            const shape = this.findShapeAtPoint(worldPoint.x, worldPoint.y);
            if (shape && shape.id) {
                this.saveState();
                this.shapes = this.shapes.filter(s => s.id !== shape.id);
                this.socket.send(JSON.stringify({
                    type: "delete",
                    roomId: this.roomId,
                    shapeId: shape.id
                }));
                this.render();
            }
            return;
        }

        // Handle pencil start
        if (this.selectedTool === "pencil") {
            this.currentPencilPoints = [worldPoint];
        }
    };

    private onMouseMove = (e: MouseEvent) => {
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        if (!this.isMouseDown) return;

        const worldPoint = this.screenToWorld(e.clientX, e.clientY);
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        // Handle panning
        if (this.isPanning) {
            this.viewport.x += e.movementX;
            this.viewport.y += e.movementY;
            this.onViewportChange?.(this.viewport);
            this.render();
            return;
        }

        // Handle selection box
        if (this.selectionBox) {
            const startWorld = this.screenToWorld(this.startX, this.startY);
            this.selectionBox = {
                x: Math.min(startWorld.x, worldPoint.x),
                y: Math.min(startWorld.y, worldPoint.y),
                width: Math.abs(worldPoint.x - startWorld.x),
                height: Math.abs(worldPoint.y - startWorld.y)
            };
            this.render();
            return;
        }

        // Handle moving selection
        if (this.isMovingSelection && this.selectedShapeIds.size > 0) {
            const moveDx = e.movementX / this.viewport.scale;
            const moveDy = e.movementY / this.viewport.scale;

            this.shapes = this.shapes.map(shape => {
                if (!this.selectedShapeIds.has(shape.id || "")) return shape;

                switch (shape.type) {
                    case "rect":
                    case "text":
                    case "sticky":
                        return { ...shape, x: shape.x + moveDx, y: shape.y + moveDy };
                    case "circle":
                        return { ...shape, centerX: shape.centerX + moveDx, centerY: shape.centerY + moveDy };
                    case "line":
                    case "arrow":
                        return {
                            ...shape,
                            startX: shape.startX + moveDx,
                            startY: shape.startY + moveDy,
                            endX: shape.endX + moveDx,
                            endY: shape.endY + moveDy
                        };
                    case "pencil":
                        return {
                            ...shape,
                            points: shape.points.map((p: Point) => ({ x: p.x + moveDx, y: p.y + moveDy }))
                        };
                    default:
                        return shape;
                }
            });
            this.render();
            return;
        }

        // Handle pencil drawing
        if (this.selectedTool === "pencil" && this.currentPencilPoints) {
            this.currentPencilPoints.push(worldPoint);
        }

        // Continue erasing while dragging
        if (this.selectedTool === "eraser") {
            const shape = this.findShapeAtPoint(worldPoint.x, worldPoint.y);
            if (shape && shape.id) {
                this.shapes = this.shapes.filter(s => s.id !== shape.id);
                this.socket.send(JSON.stringify({
                    type: "delete",
                    roomId: this.roomId,
                    shapeId: shape.id
                }));
            }
        }

        this.render();
    };

    private onMouseUp = (e: MouseEvent) => {
        if (!this.isMouseDown) return;

        this.isMouseDown = false;

        const worldPoint = this.screenToWorld(e.clientX, e.clientY);
        const startWorld = this.screenToWorld(this.startX, this.startY);

        // End panning
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        // End selection box
        if (this.selectionBox) {
            // Select all shapes inside the box
            this.shapes.forEach(shape => {
                const bounds = this.getShapeBounds(shape);
                if (bounds.x >= this.selectionBox!.x &&
                    bounds.y >= this.selectionBox!.y &&
                    bounds.x + bounds.width <= this.selectionBox!.x + this.selectionBox!.width &&
                    bounds.y + bounds.height <= this.selectionBox!.y + this.selectionBox!.height) {
                    if (shape.id) {
                        this.selectedShapeIds.add(shape.id);
                    }
                }
            });
            this.selectionBox = null;
            this.onSelectionChange?.(Array.from(this.selectedShapeIds));
            this.render();
            return;
        }

        // End moving
        if (this.isMovingSelection) {
            this.isMovingSelection = false;
            this.saveState();
            return;
        }

        // Don't create shapes for select/eraser/pan
        if (["select", "eraser", "pan"].includes(this.selectedTool)) {
            return;
        }

        const width = worldPoint.x - startWorld.x;
        const height = worldPoint.y - startWorld.y;

        let shape: Shape | null = null;
        const id = generateId();

        switch (this.selectedTool) {
            case "rect":
                if (Math.abs(width) > 2 || Math.abs(height) > 2) {
                    shape = {
                        id,
                        type: "rect",
                        x: Math.min(startWorld.x, worldPoint.x),
                        y: Math.min(startWorld.y, worldPoint.y),
                        width: Math.abs(width),
                        height: Math.abs(height),
                        color: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    };
                }
                break;

            case "circle":
                const radius = Math.sqrt(width * width + height * height) / 2;
                if (radius > 2) {
                    shape = {
                        id,
                        type: "circle",
                        centerX: startWorld.x + width / 2,
                        centerY: startWorld.y + height / 2,
                        radius,
                        color: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    };
                }
                break;

            case "line":
                if (Math.abs(width) > 2 || Math.abs(height) > 2) {
                    shape = {
                        id,
                        type: "line",
                        startX: startWorld.x,
                        startY: startWorld.y,
                        endX: worldPoint.x,
                        endY: worldPoint.y,
                        color: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    };
                }
                break;

            case "arrow":
                if (Math.abs(width) > 2 || Math.abs(height) > 2) {
                    shape = {
                        id,
                        type: "arrow",
                        startX: startWorld.x,
                        startY: startWorld.y,
                        endX: worldPoint.x,
                        endY: worldPoint.y,
                        color: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    };
                }
                break;

            case "pencil":
                if (this.currentPencilPoints && this.currentPencilPoints.length > 1) {
                    shape = {
                        id,
                        type: "pencil",
                        points: [...this.currentPencilPoints],
                        color: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    };
                }
                this.currentPencilPoints = null;
                break;

            case "sticky":
                shape = {
                    id,
                    type: "sticky",
                    x: startWorld.x,
                    y: startWorld.y,
                    width: Math.max(Math.abs(width), 100),
                    height: Math.max(Math.abs(height), 80),
                    content: "",
                    backgroundColor: "#FEF08A",
                    color: this.strokeColor
                };
                break;

            case "text":
                // For text tool, prompt user for text content
                const textContent = prompt("Enter text:");
                if (textContent && textContent.trim()) {
                    shape = {
                        id,
                        type: "text",
                        x: startWorld.x,
                        y: startWorld.y,
                        content: textContent.trim(),
                        fontSize: 16,
                        fontFamily: "sans-serif",
                        color: this.strokeColor
                    };
                }
                break;
        }

        if (shape) {
            this.saveState();
            this.shapes.push(shape);

            this.socket.send(JSON.stringify({
                type: "draw",
                roomId: this.roomId,
                shape
            }));
        }

        this.render();
    };

    private onMouseLeave = () => {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
        }
    };

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Get world position before zoom
        const worldBefore = this.screenToWorld(mouseX, mouseY);

        // Calculate new scale
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, this.viewport.scale * zoomFactor));

        // Update scale
        this.viewport.scale = newScale;

        // Get world position after zoom
        const worldAfter = this.screenToWorld(mouseX, mouseY);

        // Adjust pan to keep mouse position fixed
        this.viewport.x += (worldAfter.x - worldBefore.x) * newScale;
        this.viewport.y += (worldAfter.y - worldBefore.y) * newScale;

        this.onViewportChange?.(this.viewport);
        this.render();
    };

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.onMouseDown);
        this.canvas.addEventListener("mouseup", this.onMouseUp);
        this.canvas.addEventListener("mousemove", this.onMouseMove);
        this.canvas.addEventListener("mouseleave", this.onMouseLeave);
    }

    initKeyboardHandlers() {
        document.addEventListener("keydown", this.onKeyDown);
    }

    initWheelHandler() {
        this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    }
}

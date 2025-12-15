import React, { useState, useEffect, ReactNode } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff, X, Settings } from './Icons';

// Widget configuration type
export interface WidgetConfig {
    id: string;
    title: string;
    visible: boolean;
    order: number;
}

// Default widget configuration
const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'stats', title: 'KPI Statistics', visible: true, order: 0 },
    { id: 'today', title: 'Today\'s Overview', visible: true, order: 1 },
    { id: 'chart', title: 'Financial Performance', visible: true, order: 2 },
    { id: 'tasks', title: 'High Priority Tasks', visible: true, order: 3 },
    { id: 'reporting', title: 'Reporting Snapshot', visible: true, order: 4 },
    { id: 'calendar', title: 'Upcoming Events', visible: true, order: 5 },
    { id: 'activity', title: 'Recent Activity', visible: true, order: 6 },
    { id: 'documents', title: 'Recent Documents', visible: true, order: 7 },
];

const STORAGE_KEY = 'jurisflow-dashboard-widgets';

// Hook to manage widget configuration
export function useDashboardWidgets() {
    const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch {
                    return DEFAULT_WIDGETS;
                }
            }
        }
        return DEFAULT_WIDGETS;
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }, [widgets]);

    const reorderWidgets = (startIndex: number, endIndex: number) => {
        const result = Array.from(widgets);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Update order values
        const updated = result.map((w, i) => ({ ...w, order: i }));
        setWidgets(updated);
    };

    const toggleWidgetVisibility = (widgetId: string) => {
        setWidgets(widgets.map(w =>
            w.id === widgetId ? { ...w, visible: !w.visible } : w
        ));
    };

    const resetWidgets = () => {
        setWidgets(DEFAULT_WIDGETS);
    };

    const getVisibleWidgets = () => {
        return widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
    };

    return {
        widgets,
        reorderWidgets,
        toggleWidgetVisibility,
        resetWidgets,
        getVisibleWidgets,
    };
}

// Widget wrapper component with drag handle
interface WidgetWrapperProps {
    id: string;
    index: number;
    children: ReactNode;
    isDragDisabled?: boolean;
}

export const DraggableWidget: React.FC<WidgetWrapperProps> = ({
    id,
    index,
    children,
    isDragDisabled = false
}) => {
    return (
        <Draggable draggableId={id} index={index} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`relative group ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}`}
                >
                    {/* Drag handle */}
                    <div
                        {...provided.dragHandleProps}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-1.5 border border-gray-200 dark:border-gray-700">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    {children}
                </div>
            )}
        </Draggable>
    );
};

// Widget configuration modal
interface WidgetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    widgets: WidgetConfig[];
    onToggleVisibility: (id: string) => void;
    onReset: () => void;
}

export const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
    isOpen,
    onClose,
    widgets,
    onToggleVisibility,
    onReset,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        Configure Dashboard Widgets
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-2 mb-6">
                    {widgets.map(widget => (
                        <div
                            key={widget.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                        >
                            <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                                {widget.title}
                            </span>
                            <button
                                onClick={() => onToggleVisibility(widget.id)}
                                className={`p-2 rounded-lg transition-colors ${widget.visible
                                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                                        : 'bg-gray-200 text-gray-400 dark:bg-slate-600 dark:text-gray-500'
                                    }`}
                            >
                                {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onReset}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

// DragDropContext wrapper
interface DashboardDragDropProps {
    children: ReactNode;
    onDragEnd: (result: DropResult) => void;
}

export const DashboardDragDrop: React.FC<DashboardDragDropProps> = ({ children, onDragEnd }) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            {children}
        </DragDropContext>
    );
};

// Droppable area component
interface DroppableAreaProps {
    droppableId: string;
    children: ReactNode;
    className?: string;
    direction?: 'vertical' | 'horizontal';
}

export const DroppableArea: React.FC<DroppableAreaProps> = ({
    droppableId,
    children,
    className = '',
    direction = 'vertical'
}) => {
    return (
        <Droppable droppableId={droppableId} direction={direction}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${className} ${snapshot.isDraggingOver ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                >
                    {children}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
};

// Settings button for dashboard header
interface WidgetSettingsButtonProps {
    onClick: () => void;
}

export const WidgetSettingsButton: React.FC<WidgetSettingsButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Configure Widgets"
        >
            <Settings className="w-5 h-5 text-gray-500" />
        </button>
    );
};

export default {
    useDashboardWidgets,
    DraggableWidget,
    WidgetConfigModal,
    DashboardDragDrop,
    DroppableArea,
    WidgetSettingsButton,
};
